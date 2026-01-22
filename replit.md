# Mint Auth (React + Vite)

## Overview
A React authentication application using Vite as the build tool with Tailwind CSS for styling and Framer Motion for animations. Features a complete signup flow with password validation and OTP email verification.

## Project Structure
- `src/` - Main source code
  - `App.jsx` - Main application component with page routing
  - `components/` - Reusable UI components
    - `AuthForm.jsx` - Main authentication form with password/OTP flow
    - `PasswordStrengthIndicator.jsx` - Password strength validation component
    - `TextInput.jsx` - Base text input component
    - `PasswordInput.jsx` - Password input wrapper
    - `PrimaryButton.jsx` - Button component
    - `Preloader.jsx` - Loading animation component
    - `AuthLayout.jsx` - Auth page layout
  - `pages/` - Page components
    - `AuthPage.jsx` - Authentication page
    - `OnboardingPage.jsx` - Welcome/landing page (before login)
    - `UserOnboardingPage.jsx` - Post-signup onboarding page
    - `HomePage.jsx` - Home page after login
  - `styles/` - CSS styles
    - `auth.css` - iOS-style auth form styling
    - `tailwind.css` - Tailwind configuration
- `public/` - Static assets
- `index.html` - HTML entry point

## Features
- **Password Validation**: Real-time strength indicator requiring ALL criteria to be "Strong":
  - At least 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character
  - Only "Strong" passwords can proceed
- **OTP Verification Flow** (Signup):
  - 6-digit OTP code from Supabase email
  - 180 second code expiry (hidden timer - shows error only when user attempts expired code)
  - 30 second resend cooldown between requests
  - Max 5 resend/edit attempts before rate limit triggers
  - Max 5 incorrect OTP attempts before lockout
  - Progressive cooldowns: 5min first, 30min second, 30min+ shows "contact support"
  - Edit email counts as a resend attempt and returns directly to OTP page
- **Login Flow**:
  - Email → Password → Home (on success)
  - Max 5 incorrect login attempts before 30-minute cooldown
  - Shows remaining attempts after each failed login
  - Rate limit screen with options: Reset Password or Contact Support
  - Auto-dismiss rate limit screen after 10 seconds
- **Forgot Password Flow**:
  - Send password reset email via Supabase
  - User clicks magic link in email
  - Create new password (with strength validation)
  - Confirm new password
- **Supabase Integration**:
  - User authentication (signup, login)
  - Email verification (OTP)
  - Password reset via magic link
  - Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- **iOS-Style UI**: Glassmorphism design with smooth animations

## Development
The development server runs on port 5000 using Vite.

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Test OTP Code
For development testing, the valid OTP code is: `123456`

## Deployment
This project is configured for static deployment. The build output goes to the `dist` directory.

## Technologies
- React 18
- Vite 5
- Tailwind CSS 3
- Framer Motion
- PostCSS with Autoprefixer
