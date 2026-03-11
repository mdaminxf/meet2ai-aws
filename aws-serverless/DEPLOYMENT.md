# Fast S3 + CloudFront Deployment Guide

## Architecture
- **Frontend**: S3 + CloudFront (static site at https://d2a1z182a2prw4.cloudfront.net)
- **Backend**: Lambda + API Gateway REST API (protects Gemini API key)
- **No API key exposure** - Lambda handles all AI requests securely

## Deployment Steps

### 1. Deploy Infrastructure
```bash
aws cloudformation create-stack \
  --stack-name ai-classroom \
  --template-body file://cloudformation-simple.yaml \
  --parameters ParameterKey=GeminiApiKey,ParameterValue=YOUR_GEMINI_KEY \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-north-1
```

Wait for stack creation:
```bash
aws cloudformation wait stack-create-complete --stack-name ai-classroom --region eu-north-1
```

### 2. Get Stack Outputs
```bash
aws cloudformation describe-stacks \
  --stack-name ai-classroom \
  --region eu-north-1 \
  --query 'Stacks[0].Outputs'
```

Note down:
- `APIEndpoint` - Your API Gateway URL
- `FrontendBucketName` - S3 bucket name
- `CloudFrontURL` - Your HTTPS URL

### 3. Upload Lambda Code
```bash
cd lambda-orchestrator
npm install
zip -r function.zip .
aws lambda update-function-code \
  --function-name ai-classroom-handler \
  --zip-file fileb://function.zip \
  --region eu-north-1
cd ..
```

### 4. Build Frontend
Update `.env.local` with your API endpoint:
```
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate
```

Build:
```bash
npm install
npm run build
```

### 5. Deploy to S3
```bash
aws s3 sync dist/ s3://FRONTEND_BUCKET_NAME --delete
```

### 6. Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Access Your App
Your app is now live at: `https://d2a1z182a2prw4.cloudfront.net`

## Security
✅ Gemini API key stays in Lambda (never exposed)
✅ API Gateway has no authentication (public endpoint)
✅ Rate limiting recommended via AWS WAF (optional)

## Cost Optimization
- DynamoDB: Pay-per-request (caching reduces AI calls)
- Lambda: Only charged when users make requests
- S3: Minimal storage costs
- CloudFront: Free tier covers most small apps
- Polly: ~$4 per 1M characters

## Quick Updates
To update frontend only:
```bash
npm run build
aws s3 sync dist/ s3://FRONTEND_BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

To update Lambda only:
```bash
cd lambda-orchestrator
zip -r function.zip .
aws lambda update-function-code --function-name ai-classroom-handler --zip-file fileb://function.zip --region eu-north-1
```
