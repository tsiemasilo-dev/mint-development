import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const getMintAccountNumber = (profile) =>
    profile?.mintNumber ||
    profile?.accountNumber ||
    (profile?.id ? `MINT-${String(profile.id).slice(0, 8).toUpperCase()}` : 'MINT-XXXXXXXX');

const parseAmount = (str) => {
    if (!str) return 0;
    const v = parseFloat(String(str).replace(/[R$,\s]/g, '').replace(/\+/, ''));
    return isNaN(v) ? 0 : v;
};

// ─────────────────────────────────────────────────────────────────────────────
//  generateMintPDF  — jsPDF statement
// ─────────────────────────────────────────────────────────────────────────────
export const generateMintStatement = async (
    profile,
    displayName,
    holdingsRows,
    strategyRows = [],
    activityItems = [],
    dateFrom = null,
    dateTo = null,
) => {
    const doc       = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const PW        = doc.internal.pageSize.getWidth();   // 595
    const PH        = doc.internal.pageSize.getHeight();  // 842
    const M         = 40;   // margin
    const SAFE_FOOT = 60;   // space to keep at bottom for footer

const CONFIG = {
  COLORS: {
    P:        [59,  27,  122], // Primary Purple
    P_MID:    [91,  33,  182],
    P_DIM:    [130, 95,  210],
    P_LITE:   [237, 233, 254],
    P_PALE:   [246, 244, 255],
    P_RULE:   [190, 175, 235],
    WHITE:    [255, 255, 255],
    DARK:     [18,  21,  38 ],
    BODY:     [50,  35,  90 ],
    GREEN:    [22,  163, 74 ],
    RED:      [220, 38,  38 ],
    DIV:      [210, 200, 240],
  },
  PAGE: { WIDTH: 210, HEIGHT: 297 }, // mm (not used by original pt setup but good for ref)
  MARGIN: { LEFT: 40, RIGHT: 40 }, // pt
  LOGO_ASPECT: 6293.27 / 2757.71,
};

const C = CONFIG.COLORS;

const MINT_LOGO_SVG_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MjkzLjI3IDI3NTcuNzEiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNmZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8Zz4KICAgICAgPGc+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzMzMy4xOSwyODAuOGMyNi43OSwxMy4wNywxNy42OCw1My4zNS0xMi4xMyw1My42Mmgwcy01NDIuNjMsMC01NDIuNjMsMGMtMTUuNiwwLTI4LjI0LDEyLjY0LTI4LjI0LTI4LjI0djI0MS40YzAsMTUuNi0xMi42NCwyOC4yNC0yOC4yNCwyOC4yNGgtNTE0LjM2Yy0xNS42LDAtMjguMjQtMTIuNjQtMjguMjQtMjguMjR2LTI2My4yM2MwLTEwLjExLDUuNC0xOS40NSwxNC4xNy0yNC40OEwyNzM3LjIzLDMuNzZjOC4xMy00LjY3LDE4LjA0LTUuMDEsMjYuNDYtLjlsNTY5LjUsMjc3Ljk0WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI5NjAuMDcsNDg0LjYyYy0yNi43OS0xMy4wNy0xNy42OC01My4zNSwxMi4xMy01My42MmgwczU0Mi42MywwLDU0Mi42MywwYzE1LjYsMCwyOC4yNC0xMi42NCwyOC4yNC0yOC4yNHYtMjQxLjRjMC0xNS42LDEyLjY0LTI4LjI0LTI4LjI0LTI4LjI0aDUxNC4zNmMxNS42LDAsMjguMjQsMTIuNjQsMjguMjQsMjguMjR2MjYzLjIzYzAsMTAuMTEtNS40LDE5LjQ1LTE0LjE3LDI0LjQ4bC01NDMuNzEsMzEyLjU5Yy04LjEzLDQuNjctMTguMDQsNS4wMS0yNi40Ni45bC01NjkuNS0yNzcuOTRaIi8+CiAgICAgIDwvZz4KICAgICAgPGc+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMCwyMzM3LjM2di05MjYuMjNjMC05MS4yOSwzMi4yOC0xNjkuNTgsOTYuODUtMjM0LjksNjUuMy02NC41NywxNDMuNjEtOTYuODUsMjM0LjktOTYuODVsMjQuNDljMTA0LjY1LDAsMTk0LjA3LDM3LjEzLDI2OC4yOSwxMTEuMzMsNDAuODEsNDAuODMsNzAuNSw4Ni40Nyw4OS4wNiwxMzYuOTNsMzMwLjYzLDY2Mi4zOCwzMzAuNjQtNjYyLjM4YzE4LjU0LTUwLjQ2LDQ4LjYtOTYuMSw5MC4xOC0xMzYuOTMsNzQuMjEtNzQuMiwxNjMuNjUtMTExLjMzLDI2OC4yOS0xMTEuMzhoMjMuMzhjOTIuMDIsMCwxNzAuMzMsMzIuMjgsMjM0LjksOTYuODUsNjUuMyw2NS4zMiw5Ny45NywxNDMuNjIsOTcuOTcsMjM0Ljl2OTI2LjIzaC0zNzkuNjJ2LTc4My43M2MwLTEyLjYxLTQuODQtMjMuNzQtMTQuNDctMzMuNC05LjY1LTguOS0yMC43OS0xMy4zNi0zMy40LTEzLjM2LTM2LjY4LDAtMTIuOTksMS4EyLTE4LjkyLDMuMzQtNS4yMSwyLjIyLTEwLjAyLDUuNTctMTQuNDgsMTAuMDJoLTEuMTFsLTQwOC41Nyw4MTcuMTRoLTM0OC40NWwtMTkwLjM3LTM3OS42My0yMTkuMzEtNDM3LjUxYy00LjQ2LTQuNDUtOS42NS03Ljc5LTE1LjU5LTEwLjAyLTUuOTQtMi4yMi0xMS44OC0zLjM0LTE3LjgxLTMuMzQtMTMuMzYsMC0yNC44OCw0LjQ2LTM0LjUyLDEzLjM2LTguOSw5LjY2LTEzLjM2LDIwLjgtMTMuMzYsMzMuNHY3ODMuNzNIMFoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMjc5Ljk2LDIzMzcuMzZ2LTEyMzQuNmgzNzkuNjJ2MTIzNC42aC0zNzkuNjJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDIyNy4wNiwyMzYwLjczYy0xMDQuNjYsMC0xOTQuMDktMzYuNzMtMjY4LjMxLTExMC4yMS0yLjk4LTIuMjItNS41NS00LjgyLTcuNzktNy43OWgtMS4xMmwtMTMuMzQtMTYuN2MtMi45OC0yLjk1LTUuNTctNS45Mi03LjgxLTguOWwtNDU0LjItNTQ0LjM5LTE3MS40NC0yMDUuOTVjLTIuMjQtMS40Ny00Ljg1LTIuOTYtNy44MS00LjQ1LTUuOTQtMi4yMi0xMS44OC0zLjM0LTE3LjgxLTMuMzQtMTMuMzYsMC0yNC44OCw0LjgzLTM0LjUyLDE0LjQ4LTguOSw4LjktMTMuMzYsMjAuMDMtMTMuMzYsMzMuMzl2ODMwLjVoLTM3OS42MnYtOTI2LjIzYzAtOTEuMjksMzIuMjgtMTY5LjU4LDk2Ljg1LTIzNC45LDY1LjMtNjQuNTcsMTQzLjYxLTk2Ljg1LDIzNC45LTk2Ljg1hDI0LjQ5YzEwNC42NCwwLDE5NC4wNywzNy4xMywyNjguMywxMTEuMzMsMi4yMSwyLjIyLDQuNDUsNC40NSw2LjY3LDYuNjdoMS4xbDE0LjQ4LDE2LjdjMi4yMiwyLjk4LDQuNDYsNS45NSw2LjY3LDguOTFsNjI1LjY3LDc1MC4zNGMyLjIyLDIuMjIsNC44MiwzLjcxLDcuNzksNC40NSw1Ljk0LDIuMjIsMTIuMjQsMy4zNCwxOC45MywzLjM0LDEyLjYxLDAsMjMuNzQtNC40NiwzMy40LTEzLjM2LDkuNjMtOS42NSwxNC40Ni0yMC43OCwxNC40Ni0zMy40di04MzEuNmgzNzkuNjF2OTI2LjIzYzAsOTIuMDQtMzIuNjcsMTcwLjMyLTk3Ljk2LDIzNC44OS02NC41Nyw2NC41Ny0xNDIuODgsOTYuODUtMjM0LjksOTYuODVoLTIzLjM2WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTUyOTUuNzksMjMzNy4zNnYtOTQ5LjYxaC02MTYuNzZ2LTI4NWgxNjE0LjIzdjI4NWgtNjE3Ljg2djk0OS42MWgtMzc5LjYxWiIvPgogICAgICA8L2c+CiAgICAgIDxnPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTAsMjc1NC40NnYtMTU1LjdoMjAuNDRsNTYuNDQsMTE3LjA5LDU2LjExLTExNy4wOWgyMC42NXYxNTUuNTloLTIxLjQxdi0xMDYuNTFsLTUwLjI4LDEwNi42MWgtMTAuMjdsLTUwLjM4LTEwNi42MXYxMDYuNjFIMFoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik01NDAuODQsMjc1Ny43MWMtMTU1LjU3LDAtMjguODQtMy40MS0zOS43OS0xMC4yMi0xMC45Ni02LjgxLTE5LjM0LTE2LjMtMjUuMTQtMjguNDktNS44LTEyLjE4LTguNy0yNi4zMS04LjctNDIuMzhzMi45LTMwLjIxLDguNy00Mi4zOGM1LjgtMTIuMTksMTQuMTgtMjEuNjgsMjUuMTQtMjguNTAsMTAuOTUtNi44MSwyNC4yMi0xMC4yMSwzOS43OS0xMC4yMXMyOC43NCwzLjQxLDM5LjczLDEwLjIxYzEwLjk5LDYuODEsMTkuMzcsMTYuMzEsMjUuMTQsMjguNSw1Ljc3LDEyLjE4LDguNjUsMjYuMzEsOC42NSw0Mi4zOHMtMi44OCwzMC4yMS04LjY1LDQyLjM4Yy01Ljc3LDEyLjE5LTE0LjE1LDIxLjY4LTI1LjE0LDI4LjQ5LTEwLjk5LDYuODEtMjQuMjQsMTAuMjItMzkuNzMsMTAuMjJaTTU0MC44NCwyNzM2LjE5YzExLjAzLjE1LDIwLjItMi4yOSwyNy41Mi03LjMsNy4zMS01LDEyLjgxLTEyLDE2LjQ5LTIwLjk3LDMuNjctOC45OCw1LjUxLTE5LjQxLDUuNTEtMzEuM3MtMS44NC0yMi4yOS01LjUxLTMxLjJjLTMuNjgtOC45LTkuMTgtMTUuODQtMTYuNDktMjAuODEtNy4zMi00Ljk4LTExNi40OS03LjUtMjcuNTItNy41Ny0xMS4wMy0uMTQtMjAuMiwyLjI3LTI3LjUyLDcuMjUtNy4zMiw0Ljk3LTEyLjgxLDExLjk2LTE2LjQ5LDIwLjk3LTMuNjcsOS4wMi01LjU1LDE5LjQ2LTUuNjIsMzEuMzYtLjA3LDExLjg5LDEuNzMsMjIuMjksNS40MSwzMS4xOSwzLjY4LDguOSw5LjIxLDE1Ljg0LDE2LjYsMjAuODIsNy4zOSw0Ljk4LDE2LjYsNy41LDI3LjYzLDcuNTdaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNOTI3LjkyLDI3NTQuNDZ2LTE1NS43aDIyLjkybDc2LjY2LDExNS42OXYtMTE1LjY5aDIyLjkydjE1NS43aC0yMi45MmwtNzYuNjYtMTE1Ljh2MTE1LjhoLTIyLjkyWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEzNzIuNjQsMjc1NC40NnYtMTU1LjdoOTkuNDd2MjEuM2gtNzYuODh2NDMuNjhoNjMuOXYyMS4zaC02My45djQ4LjExaDc2Ljg4djIxLjNoLTk5LjQ3WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE4MjcuNTIsMjc1NC40NnYtNjQuMzNsLTUyLjY2LTkxLjM2aDI2LjM4bDM3LjczLDY1LjQxLDM3LjczLTY1LjQxaDI2LjM4bC01Mi42Niw5MS4zNnY2NC4zM2gtMjIuOTJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjUzOC44NywyNzU0LjQ2di0xNTUuN2gyMi42djE1NS43aC0yMi42WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI4ODUuODQsMjc1NC40NnYtMTU1LjdoMjIuOTJsNzYuNjYsMTE1LjY5di0xMTUuNjloMjIuOTJ2MTU1LjdoLTIyLjkybC03Ni42Ni0xMTUuOHYxMTUuOGgtMjIuOTJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzcwNC41NiwyNzU0LjQ2di0xMzQuNGgtNTEuOHYtMjEuM2gxMjYuMTh2MjEuM2gtNTEuNzl2MTM0LjRoLTIyLjZaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDA4OC4xOCwyNzU0LjQ2di0xNTUuN2g2Mi45M2MxLjUxLDAsMy4zOS4wNSw1LjYyLjE2LDIuMjMuMTEsNC4zNi4zNCw2LjM4LjcsOC42NSwxLjM3LDE1Ljg3LDQuMzMsMjEuNjgsOC44Nyw1LjgsNC41NCwxMC4xNCwxMC4yNywxMy4wMiwxNy4xOSwyLjg5LDYuOTIsNC4zMywxNC41Niw0LjMzLDIyLjkzLDAsMTIuNC0zLjE3LDIzLjA4LTkuNTIsMzIuMDYtNi4zNCw4Ljk4LTE1Ljg2LDE0LjU4LTI4LjU0LDE2LjgxbC05LjE5LDEuMDhoLTQ0LjEydjU1LjloLTIyLjZaTTQxMTAuNzgsMjY3Ny4xNmgzOS40NmMxLjQ0LDAsMy4wNS0uMDcsNC44MS0uMjIsMS43Ni0uMTUsMy40NC0uMzksNS4wMy0uNzYsNC42MS0xLjA4LDguMzMtMy4wOCwxMS4xNC02LDIuODEtMi45Miw0LjgzLTYuMjksNi4wNS0xMC4xMSwxLjIyLTMuODIsMS44NC03LjY0LDEuODQtMTEuNDZzLS42MS03LjYyLTEuODQtMTEuNDFjLTEuMjItMy43OS0zLjI1LTcuMTQtNi4wNS0xMC4wNS0yLjgxLTIuOTItNi41My00LjkyLTExLjE0LTYtMS41OS0uNDMtMy4yNy0uNzItNS4wMy0uODctMS43Ny0uMTQtMy4zNy0uMjEtNC44MS0uMjFoLTM5LjQ2djU3LjA5Wk00MTc5LjIyLDI3NTQuNDZsLTMwLjcxLTYzLjM2LDIyLjgxLTUuODQsMzMuNzQsNjkuMmgtMjUuODRaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDUwOS45NywyNzU0LjQ2bDUwLjYxLTE1NS43aDMyLjU0bDUwLjYxLDE1NS43aC0yMy40NmwtNDYuNjEtMTQyLjA4aDUuODRsLTQ2LjA2LDE0Mi4wOGgtMjMuNDdaTTQ1MzYuMjUsMjcxOS4zMnYtMjEuMmg4MS4zMXYyMS4yaC04MS4zMVoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik00OTU1LjEyLDI3NTQuNDZ2LTE1NS43aDIyLjkzbDc2LjY2LDExNS42OXYtMTE1LjY5aDIyLjkydjE1NS43aC0yMi45MmwtNzYuNjYtMTE1Ljh2MTE1LjhoLTIyLjkzWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU0NTYuMjgsMjc1Ny43MWMtMTEuMTcsMC0yMS4yNC0xLjkzLTMwLjIyLTUuNzktOC45OC0zLjg2LTE2LjM2LTkuMzctMjIuMTctMTYuNTQtNS44LTcuMTctOS41Ny0xNS43LTExLjMtMjUuNTdsMjMuNTctMy41N2MyLjM4LDkuNTIsNy4zNSwxNi45MiwxNC45MiwyMi4yMiw3LjU3LDUuMywxNi40LDcuOTUsMjYuNSw3Ljk1LDYuMjcsMCwxMi4wNC0uOTksMTcuMy0yLjk4LDUuMjctMS45OCw5LjUtNC44MiwxMi43MS04LjU0LDMuMjEtMy43MSw0LjgxLTguMTcsNC44MS0xMy4zNSwwLTIuODEtLjQ5LTUuMy0xLjQ2LTcuNDYtLjk3LTIuMTYtMi4zMS00LjA1LTQtNS42Ny0xLjctMS42My0zLjc1LTMuMDMtNi4xNy00LjIyLTIuNDEtMS4xOS01LjA2LTIuMjItNy45NS0zLjA4bC0zOS44OS0xMS43OGMtMy44OS0xLjE1LTcuODYtMi42NS0xMS45LTQuNDktNC4wNC0xLjg0LTcuNzMtNC4yNS0xMS4wOC03LjI0LTMuMzYtMi45OS02LjA3LTYuNy04LjE3LTExLjE0LTIuMDktNC40My0zLjE0LTkuODItMy4xNC0xNi4xNiwwLTkuNTksMi40Ny0xNy43Miw3LjQxLTI0LjM4LDQuOTMtNi42NywxMS42Mi0xMS43MSwyMC4wNi0xNS4xMyw4LjQzLTMuNDIsMTcuODctNS4xNCwyOC4zMy01LjE0LDEwLjUyLjE1LDE5Ljk1LDIuMDIsMjguMjgsNS42Miw4LjMzLDMuNiwxNS4yNSw4Ljc4LDIwLjc2LDE1LjUxLDUuNTEsNi43NCw5LjMxLDE0LjksMTEuNCwyNC40OWwtMjQuMjIsNC4xMWMtMS4wOC01Ljg0LTMuMzktMTAuODctNi45Mi0xNS4wOS0zLjUzLTQuMjItNy44Ni03LjQ2LTEyLjk3LTkuNzMtNS4xMi0yLjI3LTEwLjY3LTMuNDQtMTYuNjYtMy41Mi01Ljc3LS4xNC0xMS4wNC43My0xNS44NCwyLjYtNC43OSwxLjg3LTguNjIsNC41MS0xMS40Niw3Ljg5LTIuODUsMy4zOS00LjI3LDcuMjktNC4yNywxMS42OHMxLjI2LDcuODIsMy43OSwxMC40OWMyLjUyLDIuNjcsNS42NCw0Ljc4LDkuMzUsNi4zMywzLjcyLDEuNTUsNy40MSwyLjgzLDExLjA5LDMuODRsMjguNzYsOC4xMWMzLjYsMS4wMSw3LjY5LDIuMzcsMTIuMjgsNC4wNSw0LjU4LDEuNyw5LjAxLDQuMDUsMTMuMyw3LjA4LDQuMjksMy4wMyw3Ljg0LDcuMDUsMTAuNjUsMTIuMDYsMi44MSw1LjAxLDQuMjIsMTEuMyw0LjIyLDE4Ljg3cy0xLjU4LDE0Ljc2LTQuNzYsMjAuN2MtMy4xNyw1Ljk1LTcuNTEsMTAuOTMtMTMuMDMsMTQuOTItNS41MSw0LTExLjg4LDcuMDEtMTkuMDgsOS4wMy03LjIxLDIuMDEtMTQuODEsMy4wMy0yMi44MSwzLjAzWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU4MzMuMDksMjc1NC40NnYtMTU1LjdoMjIuNnYxNTUuN2gtMjIuNloiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik02MjE4Ljg4LDI3NTQuNDZ2LTEzNC40aC01MS44di0yMS4zaDEyNi4xOHYyMS4zaC01MS43OXYxMzQuNGgtMjIuNloiLz4KICAgICAgPC9nPgogICAgPC9nPgogIDwvZz4KPC9zdmc+";

const logoCache = new Map();

async function renderLogoToPng(h) {
  const scale = 3;
  const pxH = Math.round(h * scale * (96 / 72)); // points -> pixels approx
  const pxW = Math.round(pxH * CONFIG.LOGO_ASPECT);
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([atob(MINT_LOGO_SVG_B64)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pxW; canvas.height = pxH;
      canvas.getContext("2d").drawImage(img, 0, 0, pxW, pxH);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png", 0.94));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function drawMintLogo(doc, x, y, h) {
  if (!logoCache.has(h)) logoCache.set(h, await renderLogoToPng(h));
  const w = h * CONFIG.LOGO_ASPECT;
  doc.addImage(logoCache.get(h), "PNG", x, y, w, h);
}

    const mintAcct = getMintAccountNumber(profile);
    const fromStr  = dateFrom ? new Date(dateFrom).toLocaleDateString('en-GB') : '—';
    const toStr    = dateTo   ? new Date(dateTo).toLocaleDateString('en-GB')   : new Date().toLocaleDateString('en-GB');
    const isoDate  = new Date().toISOString().split('T')[0];

    // ── Y cursor helpers ─────────────────────────────────────────────────────
    let y = 0;

    const newPage = () => {
        doc.addPage();
        y = 30; // space for header
    };

    const need = (pts) => { if (y + pts > PH - SAFE_FOOT) newPage(); };

    // ── Section heading (Pill Style) ─────────────────────────────────────────
    const sectionHeading = (label) => {
        need(40);
        y += 12;
        doc.setFillColor(...C.P);
        doc.roundedRect(M, y - 14, PW - M * 2, 20, 4, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(label.toUpperCase(), M + 10, y - 1);
        y += 10;
    };

    // ── HEADER ───────────────────────────────────────────────────────────────
    const HDR_H = 80;
    doc.setFillColor(...C.P); doc.rect(0, 0, PW, HDR_H, 'F');
    doc.setFillColor(...C.P_MID); doc.rect(0, 0, PW, 5, 'F');
    doc.setFillColor(...C.P_MID); doc.rect(0, HDR_H, PW, 2, 'F');
    
    await drawMintLogo(doc, PW - M - 12 * CONFIG.LOGO_ASPECT * (72/25.4), (HDR_H - 12 * (72/25.4)) / 2, 12 * (72/25.4));

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text("MINT INVESTMENT STATEMENT", M, 32);
    doc.setDrawColor(...C.P_RULE); doc.setLineWidth(0.5);
    doc.line(M, 38, M + 180, 38);

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(displayName || 'Client', M, 56);

    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(185, 155, 230);
    doc.text(`INVESTMENT STATEMENT  ·  ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`, M, 68);

    y = HDR_H + 25;

    // ── Client / Statement info box ──────────────────────────────────────────
    const boxH = 90;
    doc.setFillColor(...C.P_LITE);
    doc.roundedRect(M, y, PW - M * 2, boxH, 4, 4, 'F');

    const LC = M + 15;
    const RC = PW / 2 + 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.P_MID);
    doc.text('CLIENT DETAILS',  LC, y + 18);
    doc.text('STATEMENT INFO',  RC, y + 18);
    doc.setDrawColor(...C.DIV); doc.setLineWidth(0.5);
    doc.line(LC, y + 22, LC + 100, y + 22);
    doc.line(RC, y + 22, RC + 100, y + 22);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.DARK);
    const leftLines  = [`Name: ${displayName || 'Client'}`, `Client ID: ${profile?.idNumber || '—'}`, `Account: ${mintAcct}`, `Email: ${profile?.email || '—'}`];
    const rightLines = [`Period: ${fromStr} – ${toStr}`, `Generated: ${new Date().toLocaleDateString('en-GB')}`, 'Currency: ZAR', 'Platform: MINT'];
    leftLines .forEach((l, i) => doc.text(l, LC, y + 36 + i * 14));
    rightLines.forEach((l, i) => doc.text(l, RC, y + 36 + i * 14));
    y += boxH + 20;

    // ── 1. Portfolio Summary ─────────────────────────────────────────────────
    const holdingsForPdf = holdingsRows.filter(r => r.type === 'Holdings');

    const totalValue = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue), 0);
    const totalPL    = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL), 0);

    sectionHeading('1.  PORTFOLIO SUMMARY');

    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        tableWidth: PW - M * 2,
        head: [['Metric', 'Value (ZAR)']],
        body: [
            ['Total Holdings Market Value', `R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Total Unrealised P/L',        `${totalPL >= 0 ? '+' : '−'}R ${Math.abs(totalPL).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Holdings Count',              `${holdingsForPdf.length}`],
            ['Active Strategies',           `${strategyRows.length}`],
            ['Transactions in Period',      `${activityItems.length}`],
        ],
        styles:             { font: 'helvetica', fontSize: 9.5, cellPadding: 7, textColor: C.DARK, lineColor: C.DIV, lineWidth: 0.1 },
        headStyles:         { fillColor: C.P, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: C.P_PALE },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        didParseCell(d) {
            if (d.section === 'body' && d.column.index === 1) {
                const txt = d.cell.text[0] || '';
                if (txt.startsWith('+')) d.cell.styles.textColor = C.GREEN;
                if (txt.startsWith('−')) d.cell.styles.textColor = C.RED;
            }
        },
    });
    y = doc.lastAutoTable.finalY + 16;

    // ── 2. Strategy Allocation ───────────────────────────────────────────────
    sectionHeading('2.  STRATEGY ALLOCATION & PERFORMANCE');

    if (strategyRows.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Strategy', 'Risk Level', 'Current Value', 'Day Return', '1M Return']],
            body: strategyRows.map(s => {
                const pct = s.changePct != null && isFinite(+s.changePct) ? +s.changePct : null;
                const r1m = s.r1m      != null && isFinite(+s.r1m)        ? +s.r1m        : null;
                return [
                    s.fullName || s.title || '—',
                    s.riskLevel || '—',
                    s.amount || '—',
                    pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—',
                    r1m != null ? `${r1m >= 0 ? '+' : ''}${r1m.toFixed(2)}%` : '—',
                ];
            }),
            styles:             { font: 'helvetica', fontSize: 9, cellPadding: 7, textColor: C.DARK, lineColor: C.DIV, lineWidth: 0.1 },
            headStyles:         { fillColor: C.P, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: C.P_PALE },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
            didParseCell(d) {
                if (d.section === 'body' && d.column.index >= 3) {
                    const v = parseFloat(d.cell.text[0]);
                    if (!isNaN(v)) d.cell.styles.textColor = v >= 0 ? C.GREEN : C.RED;
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No strategies subscribed.', M + 4, y + 12); y += 28;
    }

    // ── 3. Holdings Detail ───────────────────────────────────────────────────
    sectionHeading('3.  HOLDINGS DETAIL');

    if (holdingsForPdf.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Instrument', 'Ticker', 'Qty', 'Avg Cost', 'Mkt Price', 'Mkt Value', 'Unreal. P/L']],
            body: holdingsForPdf.map(r => [
                r.instrument || r.title || '—',
                r.ticker    || '—',
                r.quantity  || '—',
                r.avgCost   || '—',
                r.marketPrice || '—',
                r.marketValue || '—',
                r.unrealizedPL || '—',
            ]),
            styles:             { font: 'helvetica', fontSize: 8.5, cellPadding: 6, textColor: C.DARK, lineColor: C.DIV, lineWidth: 0.1 },
            headStyles:         { fillColor: C.P, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5 },
            alternateRowStyles: { fillColor: C.P_PALE },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right'  },
                3: { halign: 'right'  },
                4: { halign: 'right'  },
                5: { halign: 'right', fontStyle: 'bold' },
                6: { halign: 'right', fontStyle: 'bold' },
            },
            didParseCell(d) {
                if (d.section === 'body' && d.column.index === 6) {
                    const v = parseAmount(d.cell.text[0]);
                    const raw = d.cell.text[0] || '';
                    const isNeg = raw.startsWith('-');
                    d.cell.styles.textColor = (!isNeg && v !== 0) ? C.GREEN : (isNeg ? C.RED : C.DARK);
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No holdings found.', M + 4, y + 12); y += 28;
    }

    // ── 4. Transaction History ───────────────────────────────────────────────
    sectionHeading('4.  TRANSACTION HISTORY');

    if (activityItems.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Date', 'Description', 'Type', 'Status', 'Amount']],
            body: activityItems.map(t => [
                t.displayDate || t.date || '—',
                t.title || '—',
                t.direction === 'credit' ? 'IN' : 'OUT',
                t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : '—',
                t.amount || '—',
            ]),
            styles:             { font: 'helvetica', fontSize: 8.5, cellPadding: 6, textColor: C.DARK, lineColor: C.DIV, lineWidth: 0.1 },
            headStyles:         { fillColor: C.P, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5 },
            alternateRowStyles: { fillColor: C.P_PALE },
            columnStyles: {
                2: { halign: 'center', fontStyle: 'bold' },
                3: { halign: 'center' },
                4: { halign: 'right',  fontStyle: 'bold' },
            },
            didParseCell(d) {
                if (d.section === 'body') {
                    if (d.column.index === 2) d.cell.styles.textColor = d.cell.text[0] === 'IN' ? C.GREEN : C.RED;
                    if (d.column.index === 4) d.cell.styles.textColor = C.DARK;
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No transactions in period.', M + 4, y + 12); y += 28;
    }

    // ── Disclosures ──────────────────────────────────────────────────────────
    need(100);
    doc.setDrawColor(...C.P); doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y); y += 12;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.P);
    doc.text('Important Disclosures', M, y); y += 12;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    const disclosures = [
        'MINT is a regulated financial services platform operating under the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Client assets are held in custody with an approved third-party custodian and are fully segregated from MINT\'s own assets.',
        'Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed. This statement is for informational purposes only and does not constitute investment advice.',
        'Tax treatment depends on individual circumstances. Clients are responsible for obtaining independent tax advice. 3 Gwen Ln, Sandown, Sandton, 2031 | info@mymint.co.za | +27 10 276 0531',
    ];
    disclosures.forEach(para => {
        const lines = doc.splitTextToSize(para, PW - M * 2);
        need(lines.length * 9 + 6);
        doc.text(lines, M, y);
        y += lines.length * 9 + 6;
    });

    // ── Footer on every page ─────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const fy = PH - 32;
        doc.setFillColor(...C.P);
        doc.rect(0, fy, PW, 32, 'F');
        doc.setFillColor(...C.P_MID); doc.rect(0, fy, PW, 1.2, 'F');
        
        await drawMintLogo(doc, M, fy + 8, 4.5 * (72/25.4));
        
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(185, 160, 225);
        doc.text(`INVESTMENT STATEMENT  ·  ${displayName}  ·  ${new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`, M + 80, fy + 16);
        
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 130, 200);
        doc.text('MINT (Pty) Ltd · Authorised FSP 55118 · FSCA Regulated · Registered Credit Provider NCRCP22892', M, fy + 26);
        
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 140, 200);
        doc.text(`Page ${p} of ${totalPages}`, PW - M, fy + 14, { align: 'right' });
        doc.text(`Generated ${isoDate}`, PW - M, fy + 24, { align: 'right' });
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    const safeName = (displayName || 'Client').trim().replace(/\s+/g, '_');
    const safeAcct = mintAcct.replace(/[^A-Z0-9\-]/gi, '');
    doc.save(`MINT_Statement_${safeName}_${safeAcct}_${isoDate}.pdf`);
};
