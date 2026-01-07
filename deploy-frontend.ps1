# Deploy Frontend to AWS S3 + CloudFront
# Run this script from the repository root

param(
    [switch]$SkipBuild,
    [switch]$SkipTerraform
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend Deployment to AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Apply Terraform (if not skipped)
if (-not $SkipTerraform) {
    Write-Host "`n[1/4] Applying Terraform infrastructure..." -ForegroundColor Yellow
    Push-Location infrastructure/terraform
    terraform init -upgrade
    terraform apply -auto-approve
    
    # Get outputs
    $bucketName = terraform output -raw frontend_bucket_name
    $distributionId = terraform output -raw cloudfront_distribution_id
    $frontendUrl = terraform output -raw frontend_url
    Pop-Location
} else {
    Write-Host "`n[1/4] Skipping Terraform (using existing infrastructure)..." -ForegroundColor Yellow
    Push-Location infrastructure/terraform
    $bucketName = terraform output -raw frontend_bucket_name
    $distributionId = terraform output -raw cloudfront_distribution_id
    $frontendUrl = terraform output -raw frontend_url
    Pop-Location
}

Write-Host "  Bucket: $bucketName" -ForegroundColor Gray
Write-Host "  Distribution ID: $distributionId" -ForegroundColor Gray

# Step 2: Build the frontend (if not skipped)
if (-not $SkipBuild) {
    Write-Host "`n[2/4] Building Next.js frontend..." -ForegroundColor Yellow
    Push-Location frontend
    npm run build
    Pop-Location
} else {
    Write-Host "`n[2/4] Skipping build (using existing build)..." -ForegroundColor Yellow
}

# Step 3: Upload to S3
Write-Host "`n[3/4] Uploading to S3..." -ForegroundColor Yellow
aws s3 sync frontend/out "s3://$bucketName" --delete --cache-control "max-age=31536000,public" --exclude "*.html"
aws s3 sync frontend/out "s3://$bucketName" --delete --cache-control "no-cache,no-store,must-revalidate" --include "*.html"

# Step 4: Invalidate CloudFront cache
Write-Host "`n[4/4] Invalidating CloudFront cache..." -ForegroundColor Yellow
aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nFrontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "`nNote: CloudFront propagation may take a few minutes." -ForegroundColor Yellow
