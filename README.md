{
  "name": "workdiary-ai-generator",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node -e \"const fs=require('fs'); if(!fs.existsSync('public/index.html')){throw new Error('public/index.html not found')} console.log('build ok: public/index.html exists')\"",
    "dev": "vercel dev",
    "start": "vercel dev"
  },
  "dependencies": {},
  "engines": {
    "node": ">=18"
  }
}
