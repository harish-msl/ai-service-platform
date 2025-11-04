# Next.js 15.3.0 + Node.js 22 Fix Documentation

## Issue Description

When running Next.js 15.3.0 with Node.js 22.11.0, you may encounter this error:

```
TypeError: localStorage.getItem is not a function
(node:XXXX) Warning: `--localstorage-file` was provided without a valid path
```

## Root Cause

Node.js 22 introduced an experimental `--experimental-webstorage` feature that provides a polyfill for `localStorage` on the server side. Next.js's built-in `DevOverlay` component attempts to use this experimental feature without providing the required `--localstorage-file` path, causing the error.

The error originates from:
- `node:internal/webstorage` module in Node.js 22
- Next.js `DevOverlay` component trying to access `localStorage` during SSR
- Stack trace shows: `at Object.get (node:internal/webstorage:32:25)`

## Solution

Disable the experimental webstorage feature by setting the `NODE_OPTIONS` environment variable:

### Windows (Command Prompt/PowerShell)

```bash
set NODE_OPTIONS=--no-experimental-webstorage
pnpm run dev
```

Or use the provided batch script:
```bash
./dev.bat
```

### Linux/Mac (Bash)

```bash
export NODE_OPTIONS="--no-experimental-webstorage"
pnpm run dev
```

Or use the provided shell script:
```bash
chmod +x dev.sh
./dev.sh
```

## Permanent Fix

Add to `.env.local`:

```env
NODE_OPTIONS=--no-experimental-webstorage
```

**Note:** This environment variable only affects the Next.js development server, not your application code.

## Alternative Solutions

### Option 1: Downgrade Next.js (Not Recommended)

```bash
pnpm remove next
pnpm add next@15.0.3
```

This is not recommended as you'll miss out on bug fixes and features in 15.3.0.

### Option 2: Wait for Next.js Fix

Monitor this issue on GitHub:
- https://github.com/vercel/next.js/issues

The Next.js team is aware of this issue and will likely fix it in a future release.

### Option 3: Use Node.js 20 LTS

```bash
nvm use 20
# or
nvm install 20.11.0
nvm use 20.11.0
```

Node.js 20 LTS doesn't have the experimental webstorage feature, so the error won't occur.

## Cookie-Based Authentication

This project uses **cookie-based authentication** instead of localStorage to avoid SSR issues entirely:

- ✅ SSR-safe (cookies work on both client and server)
- ✅ More secure (HttpOnly cookies possible)
- ✅ No hydration issues
- ✅ Works with server components

Implementation:
- **js-cookie** library for client-side cookie management
- Cookies store: `auth_user`, `auth_access_token`, `auth_refresh_token`
- Automatic token refresh via Axios interceptors

## Verification

After applying the fix, the server should start without errors:

```bash
> next dev -p 3001

   ▲ Next.js 15.3.0
   - Local:        http://localhost:3001
   - Network:      http://192.168.1.7:3001

 ✓ Starting...
 ✓ Ready in 2.6s
```

Visit `http://localhost:3001` - you should see the homepage without any errors.

## Troubleshooting

### If the error persists:

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Should show v22.11.0 or similar
   ```

4. **Verify environment variable is set:**
   ```bash
   # Windows
   echo %NODE_OPTIONS%
   
   # Linux/Mac
   echo $NODE_OPTIONS
   ```

5. **Check for conflicting global NODE_OPTIONS:**
   ```bash
   # Windows
   set NODE_OPTIONS=
   
   # Linux/Mac
   unset NODE_OPTIONS
   ```

## Related Files

- `next.config.js` - Webpack configuration to prevent localStorage polyfills
- `.env.local` - Environment variables including NODE_OPTIONS
- `lib/providers/auth-provider.tsx` - Cookie-based auth implementation
- `lib/api/client.tsx` - Axios client with cookie-based tokens
- `dev.bat` - Windows startup script with fix
- `dev.sh` - Linux/Mac startup script with fix

## Future Updates

Once Next.js releases a fix (expected in 15.3.1 or 15.4.0), you can remove the `NODE_OPTIONS` workaround and use the standard `pnpm run dev` command.

---

**Last Updated:** November 2, 2025  
**Next.js Version:** 15.3.0  
**Node.js Version:** 22.11.0 LTS  
**Status:** ✅ Fixed with NODE_OPTIONS workaround
