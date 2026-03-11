# Quick Deploy to Existing Infrastructure

You already have Lambda function: `orchestra` (arn:aws:lambda:eu-north-1:637423421920:function:orchestra)

## Step 1: Update Lambda Code

```powershell
cd aws-serverless/lambda-orchestrator
npm install

# Create zip file (PowerShell)
Compress-Archive -Path * -DestinationPath function.zip -Force

# Update Lambda
aws lambda update-function-code `
  --function-name orchestra `
  --zip-file fileb://function.zip `
  --region eu-north-1

cd ../..
```

## Step 2: Create API Gateway REST API

```powershell
# Create REST API
$API_ID = aws apigateway create-rest-api `
  --name "ai-classroom-api" `
  --description "AI Classroom REST API" `
  --region eu-north-1 `
  --query 'id' `
  --output text

Write-Host "API ID: $API_ID"

# Get root resource ID
$ROOT_ID = aws apigateway get-resources `
  --rest-api-id $API_ID `
  --region eu-north-1 `
  --query 'items[0].id' `
  --output text

# Create /generate resource
$RESOURCE_ID = aws apigateway create-resource `
  --rest-api-id $API_ID `
  --parent-id $ROOT_ID `
  --path-part generate `
  --region eu-north-1 `
  --query 'id' `
  --output text

# Create POST method
aws apigateway put-method `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method POST `
  --authorization-type NONE `
  --region eu-north-1

# Create Lambda integration
aws apigateway put-integration `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method POST `
  --type AWS_PROXY `
  --integration-http-method POST `
  --uri "arn:aws:apigateway:eu-north-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-north-1:637423421920:function:orchestra/invocations" `
  --region eu-north-1

# Create OPTIONS method for CORS
aws apigateway put-method `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method OPTIONS `
  --authorization-type NONE `
  --region eu-north-1

# Create MOCK integration for OPTIONS
aws apigateway put-integration `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method OPTIONS `
  --type MOCK `
  --request-templates '{\"application/json\": \"{\\\"statusCode\\\": 200}\"}' `
  --region eu-north-1

# Add method response for OPTIONS (MUST come before integration response)
aws apigateway put-method-response `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method OPTIONS `
  --status-code 200 `
  --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":true,\"method.response.header.Access-Control-Allow-Methods\":true,\"method.response.header.Access-Control-Allow-Origin\":true}' `
  --region eu-north-1

# Add integration response for OPTIONS
aws apigateway put-integration-response `
  --rest-api-id $API_ID `
  --resource-id $RESOURCE_ID `
  --http-method OPTIONS `
  --status-code 200 `
  --response-parameters '{\"method.response.header.Access-Control-Allow-Headers\":\"''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token''\",\"method.response.header.Access-Control-Allow-Methods\":\"''POST,OPTIONS''\",\"method.response.header.Access-Control-Allow-Origin\":\"''*''\"}' `
  --region eu-north-1

# Deploy API
aws apigateway create-deployment `
  --rest-api-id $API_ID `
  --stage-name prod `
  --region eu-north-1

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission `
  --function-name orchestra `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:eu-north-1:637423421920:${API_ID}/*" `
  --region eu-north-1

Write-Host ""
Write-Host "✅ API Gateway created!" -ForegroundColor Green
Write-Host "Your API Endpoint: https://${API_ID}.execute-api.eu-north-1.amazonaws.com/prod/generate" -ForegroundColor Yellow
```

## Step 3: Update Frontend Config

Create `.env.local` file in project root:
```powershell
# Replace YOUR_API_ID with the actual API ID from Step 2
@"
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate
"@ | Out-File -FilePath .env.local -Encoding utf8
```

Or manually create `.env.local` with:
```
VITE_API_ENDPOINT=https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate
```

## Step 4: Build and Deploy Frontend

```powershell
# Build
npm install
npm run build

# Deploy to your existing S3 bucket (from CloudFormation outputs)
aws s3 sync dist/ s3://ai-classroom-frontend-637423421920 --delete --region eu-north-1

# Get CloudFront Distribution ID (if you don't know it)
$DIST_ID = aws cloudfront list-distributions `
  --query "DistributionList.Items[?Origins.Items[?DomainName=='ai-classroom-frontend-637423421920.s3-website.eu-north-1.amazonaws.com']].Id" `
  --output text `
  --region eu-north-1

Write-Host "Distribution ID: $DIST_ID"

# Invalidate CloudFront cache
aws cloudfront create-invalidation `
  --distribution-id $DIST_ID `
  --paths "/*"
```

## Step 5: Access Your App

Your app will be live at: `https://d2a1z182a2prw4.cloudfront.net`

## Test API Endpoint

```powershell
# Test with Invoke-RestMethod
$response = Invoke-RestMethod -Uri "https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"prompt": "What is 2+2?"}'

$response | ConvertTo-Json -Depth 10
```

Or use curl if installed:
```powershell
curl -X POST https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate `
  -H "Content-Type: application/json" `
  -d '{\"prompt\": \"What is 2+2?\"}'
```

## Notes
- No API key exposed in frontend ✅
- Lambda `orchestra` protects your Gemini API key ✅
- CloudFront serves HTTPS ✅
- API Gateway is public (add WAF rate limiting if needed)
