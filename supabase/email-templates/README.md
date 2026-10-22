# Passwordless sign-in email

The admin UI requests a code with `shouldCreateUser: false` and verifies it with `verifyOtp`, type `email`. Server-side active-team checks remain unchanged.

## Required hosted configuration (not applied by GitHub deployment)

In the matching Supabase project open Authentication → Email Templates / Emails → Magic Link. Set subject **Your JabWeMeat sign-in code** and replace the HTML body with `magic-link.html`. It uses `{{ .Token }}` instead of `{{ .ConfirmationURL }}`. Confirm the email provider uses six-digit OTPs to match the admin input.

This template is project-wide, so review customer passwordless flows before saving. Sender name/address and SMTP are separate settings. Keep existing expiry unless intentionally changing it; email OTP expiry also affects other authentication links.

Request a fresh email after saving. Verify the code on the site and confirm the authorised dashboard opens. Do not record or share real codes.
