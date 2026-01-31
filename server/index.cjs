const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = "https://api.sumsub.com";

function createSignature(ts, method, path, body = "") {
  const data = ts + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(data)
    .digest("hex");
}

async function sumsubRequest(method, path, body = null) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = createSignature(ts, method, path, bodyStr);

  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-App-Token": SUMSUB_APP_TOKEN,
    "X-App-Access-Sig": signature,
    "X-App-Access-Ts": ts,
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  return response.json();
}

app.post("/api/samsub/init-websdk", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured. Please add SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY secrets." },
      });
    }

    const { externalUserId, userId } = req.body;
    const levelName = "basic-kyc-level";

    const applicantPath = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
    const applicantBody = {
      externalUserId: externalUserId || userId || `user-${Date.now()}`,
    };

    const applicantResult = await sumsubRequest("POST", applicantPath, applicantBody);

    if (!applicantResult.id) {
      return res.status(400).json({
        success: false,
        error: { message: applicantResult.description || "Failed to create applicant" },
      });
    }

    const applicantId = applicantResult.id;

    const tokenPath = `/resources/accessTokens?userId=${encodeURIComponent(applicantBody.externalUserId)}&levelName=${encodeURIComponent(levelName)}`;
    const tokenResult = await sumsubRequest("POST", tokenPath);

    if (!tokenResult.token) {
      return res.status(400).json({
        success: false,
        error: { message: tokenResult.description || "Failed to generate access token" },
      });
    }

    const websdkUrl = `https://cockpit.sumsub.com/checkus#/accessToken=${tokenResult.token}`;

    res.json({
      success: true,
      data: {
        applicantId,
        accessToken: tokenResult.token,
        websdkUrl,
      },
    });
  } catch (error) {
    console.error("Sumsub init error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Internal server error" },
    });
  }
});

app.get("/api/samsub/status/:applicantId", async (req, res) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: { message: "Sumsub credentials not configured" },
      });
    }

    const { applicantId } = req.params;
    const path = `/resources/applicants/${encodeURIComponent(applicantId)}/requiredIdDocsStatus`;
    const result = await sumsubRequest("GET", path);

    let outcome = "pending";
    if (result.IDENTITY) {
      if (result.IDENTITY.reviewResult?.reviewAnswer === "GREEN") {
        outcome = "completed";
      } else if (result.IDENTITY.reviewResult?.reviewAnswer === "RED") {
        outcome = "failed";
      }
    }

    res.json({
      success: true,
      data: { outcome, details: result },
    });
  } catch (error) {
    console.error("Sumsub status error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Internal server error" },
    });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sumsub API server running on port ${PORT}`);
});
