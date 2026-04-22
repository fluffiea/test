$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api/v1'

function Login($username, $password) {
  $body = @{ username = $username; password = $password } | ConvertTo-Json -Compress
  $resp = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $body
  if ($resp.code -ne 0) { throw "login failed: $($resp | ConvertTo-Json -Compress)" }
  return $resp.data
}

function AuthHeader($token) {
  return @{ Authorization = "Bearer $token" }
}

Write-Host '== login jiangjiang & mengmeng ==' -ForegroundColor Cyan
$j = Login 'jiangjiang' '251212'
$m = Login 'mengmeng' '251212'
Write-Host "  jiang.user.id = $($j.user.id)"
Write-Host "  meng.user.id  = $($m.user.id)"
Write-Host "  partnerId of jiang = $($j.user.partnerId)"

Write-Host '== (1) jiangjiang 发一条纯文字 ==' -ForegroundColor Cyan
$body1 = @{ text = 'hello from jiangjiang' } | ConvertTo-Json -Compress
$r1 = Invoke-RestMethod -Method Post -Uri "$base/moments" -Headers (AuthHeader $j.accessToken) -ContentType 'application/json' -Body $body1
$r1 | ConvertTo-Json -Compress -Depth 6
$m1Id = $r1.data.id

Write-Host '== (2) mengmeng 发一条带图 ==' -ForegroundColor Cyan
$body2 = @{ text = 'meng pic'; images = @('/static/2026/04/xxx.png', '/static/2026/04/yyy.png') } | ConvertTo-Json -Compress
$r2 = Invoke-RestMethod -Method Post -Uri "$base/moments" -Headers (AuthHeader $m.accessToken) -ContentType 'application/json' -Body $body2
$r2 | ConvertTo-Json -Compress -Depth 6
$m2Id = $r2.data.id

Write-Host '== (3) jiangjiang GET /moments 应能看到 2 条 ==' -ForegroundColor Cyan
$list = Invoke-RestMethod -Method Get -Uri "$base/moments?limit=20" -Headers (AuthHeader $j.accessToken)
$list | ConvertTo-Json -Compress -Depth 6

Write-Host '== (4) mengmeng GET /moments 也应看到 2 条 ==' -ForegroundColor Cyan
$list2 = Invoke-RestMethod -Method Get -Uri "$base/moments?limit=20" -Headers (AuthHeader $m.accessToken)
"items.count = $($list2.data.items.Count); nextCursor = $($list2.data.nextCursor)"

Write-Host '== (5) 边界：text 与 images 同时为空 → E_VALIDATION ==' -ForegroundColor Cyan
$empty = @{} | ConvertTo-Json -Compress
try {
  Invoke-RestMethod -Method Post -Uri "$base/moments" -Headers (AuthHeader $j.accessToken) -ContentType 'application/json' -Body $empty
  '  ERROR: expected failure'
} catch {
  $resp = $_.ErrorDetails.Message
  "  OK -> $resp"
}

Write-Host '== (6) 边界：text 超过 500 ==' -ForegroundColor Cyan
$long = @{ text = ('x' * 501) } | ConvertTo-Json -Compress
try {
  Invoke-RestMethod -Method Post -Uri "$base/moments" -Headers (AuthHeader $j.accessToken) -ContentType 'application/json' -Body $long
  '  ERROR: expected failure'
} catch {
  "  OK -> $($_.ErrorDetails.Message)"
}

Write-Host '== (7) 边界：images 含非法 URL ==' -ForegroundColor Cyan
$badImg = @{ images = @('not-a-url') } | ConvertTo-Json -Compress
try {
  Invoke-RestMethod -Method Post -Uri "$base/moments" -Headers (AuthHeader $j.accessToken) -ContentType 'application/json' -Body $badImg
  '  ERROR: expected failure'
} catch {
  "  OK -> $($_.ErrorDetails.Message)"
}

Write-Host '== (8) 删除别人的 → E_MOMENT_FORBIDDEN ==' -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Delete -Uri "$base/moments/$m2Id" -Headers (AuthHeader $j.accessToken)
  '  ERROR: expected failure'
} catch {
  "  OK -> $($_.ErrorDetails.Message)"
}

Write-Host '== (9) 删除自己的 OK ==' -ForegroundColor Cyan
$ok = Invoke-RestMethod -Method Delete -Uri "$base/moments/$m1Id" -Headers (AuthHeader $j.accessToken)
$ok | ConvertTo-Json -Compress

Write-Host '== (10) 再列表：jiangjiang 只看得到 mengmeng 的那条（软删生效）==' -ForegroundColor Cyan
$list3 = Invoke-RestMethod -Method Get -Uri "$base/moments" -Headers (AuthHeader $j.accessToken)
"items.count = $($list3.data.items.Count)"
$list3.data.items | ForEach-Object { "  - $($_.author.username): $($_.text)" }

Write-Host '== all green ==' -ForegroundColor Green
