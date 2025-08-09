# Deployment Guide

## Quick Deploy Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   ```bash
   vercel env add REACT_APP_CLAUDE_API_KEY
   ```

4. **Your app will be live at:** `https://your-project.vercel.app`

### Option 2: Netlify

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com](https://netlify.com)
   - Drag the `build` folder to the deploy area
   - Or use CLI: `npm install -g netlify-cli && netlify deploy`

3. **Set Environment Variables:**
   - Site Settings → Environment Variables
   - Add `REACT_APP_CLAUDE_API_KEY`

### Option 3: GitHub Pages

1. **Add to package.json:**
   ```json
   {
     "homepage": "https://yourusername.github.io/your-repo-name",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

2. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Environment Variables

All platforms need your Claude API key:

```bash
REACT_APP_CLAUDE_API_KEY=your_actual_api_key_here
```

## Testing Checklist

Before deploying, ensure:

- [ ] All dependencies are installed (`npm install`)
- [ ] App builds successfully (`npm run build`)
- [ ] Claude API key is configured
- [ ] WordPress test site is accessible
- [ ] CORS issues are handled (if any)

## Troubleshooting

### Common Issues:

1. **Build fails:**
   - Check for missing dependencies
   - Verify all imports are correct

2. **API key not working:**
   - Ensure environment variable is set correctly
   - Check platform-specific variable naming

3. **CORS errors:**
   - WordPress site must allow cross-origin requests
   - Consider using a CORS proxy for testing

### Platform-Specific Notes:

**Vercel:**
- Automatically handles React builds
- Great for development and production
- Free tier includes 100GB bandwidth

**Netlify:**
- Excellent for static sites
- Good free tier (100GB/month)
- Easy drag-and-drop deployment

**GitHub Pages:**
- Completely free
- Good for demos and testing
- Requires public repository (or GitHub Pro for private)

## Recommended for Testing:

**For quick testing:** Vercel or Netlify
**For demo purposes:** GitHub Pages
**For production:** Vercel or Firebase

## Next Steps:

1. Choose your preferred platform
2. Follow the deployment steps
3. Set up environment variables
4. Test with a WordPress site
5. Share the live URL for feedback

---

**Note:** All platforms offer free tiers suitable for testing. Choose based on your specific needs and familiarity with the platform.
