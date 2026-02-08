# How to Get a GitHub Copilot Token

This guide will help you obtain a GitHub token for use with CodePilot and GitHub Copilot.

## Prerequisites

- A GitHub account
- An active GitHub Copilot subscription (Individual, Business, or Enterprise)

## Step-by-Step Guide

### 1. Sign in to GitHub

Navigate to [github.com](https://github.com) and sign in to your account.

### 2. Access Personal Access Tokens Settings

1. Click on your profile picture in the top-right corner
2. Select **Settings** from the dropdown menu
3. In the left sidebar, scroll down and click on **Developer settings**
4. Click on **Personal access tokens**
5. Select **Tokens (classic)** or **Fine-grained tokens** (recommended)

**Direct link**: [github.com/settings/tokens](https://github.com/settings/tokens)

### 3. Generate a New Token

#### For Fine-Grained Tokens (Recommended):

1. Click **Generate new token** → **Fine-grained token**
2. Fill in the following details:
   - **Token name**: Enter a descriptive name (e.g., "CodePilot Desktop App")
   - **Expiration**: Choose an expiration period (90 days recommended)
   - **Description**: Optional description for your reference
   - **Resource owner**: Select your account or organization
3. Under **Repository access**, select the appropriate option for your use case
4. Under **Permissions**, expand **Account permissions** and enable:
   - **Copilot**: Read access (required)
5. Click **Generate token** at the bottom of the page

#### For Classic Tokens:

1. Click **Generate new token** → **Generate new token (classic)**
2. Fill in the following details:
   - **Note**: Enter a descriptive name (e.g., "CodePilot Desktop App")
   - **Expiration**: Choose an expiration period (90 days recommended)
3. Select the following scopes:
   - `user:email` - Access user email addresses (recommended)
   - `read:org` - Read org and team membership (if using organization Copilot)
4. Click **Generate token** at the bottom of the page

### 4. Copy Your Token

⚠️ **Important**: Copy your token immediately! You won't be able to see it again.

The token will look like:
- Fine-grained: `github_pat_...` (starts with `github_pat_`)
- Classic: `ghp_...` (starts with `ghp_`)

### 5. Configure CodePilot

1. Open CodePilot application
2. Navigate to **Settings**
3. Find the **GitHub Copilot Authentication** section
4. Paste your token into the **GitHub Token** field
5. Click **Save GitHub Token**

### 6. Verify Connection

After saving the token:
1. Check the connection status indicator in the top bar
2. It should show as "Connected" with the GitHub Copilot icon
3. Try starting a new chat to verify the integration works

## Alternative: Using GitHub Copilot CLI

If you prefer not to use a token, you can authenticate using the GitHub Copilot CLI:

```bash
# Install GitHub Copilot CLI
npm install -g @github/copilot

# Authenticate
copilot

# Then run /login command in the CLI
```

CodePilot will automatically use your authenticated session from the CLI.

## Troubleshooting

### "Invalid token" error
- Verify the token was copied correctly (no extra spaces)
- Ensure the token hasn't expired
- Check that you selected the correct permissions/scopes

### "No Copilot subscription" error
- Verify you have an active GitHub Copilot subscription
- Check your subscription at [github.com/settings/copilot](https://github.com/settings/copilot)

### Connection issues
- Ensure you have internet connectivity
- Check if GitHub services are operational: [githubstatus.com](https://www.githubstatus.com)
- Try regenerating the token with the same permissions

## Security Best Practices

1. **Never share your token** with anyone or commit it to version control
2. **Use fine-grained tokens** with minimal required permissions
3. **Set reasonable expiration dates** (30-90 days recommended)
4. **Revoke unused tokens** from your [GitHub tokens page](https://github.com/settings/tokens)
5. **Rotate tokens regularly** for enhanced security

## Token Scopes Explained

- **Copilot (read)**: Allows the application to access GitHub Copilot services
- **user:email**: Allows reading your email address for account identification
- **read:org**: Allows reading organization membership (needed if Copilot is via organization)

## Need Help?

- GitHub Copilot Documentation: [docs.github.com/copilot](https://docs.github.com/en/copilot)
- GitHub Support: [support.github.com](https://support.github.com)
- CodePilot Issues: [github.com/BenHao-WTG/CodePilot/issues](https://github.com/BenHao-WTG/CodePilot/issues)
