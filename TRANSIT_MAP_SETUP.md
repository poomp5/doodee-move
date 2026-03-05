# Transit Map Building Feature - Setup Guide

## Overview
This feature allows users to contribute transit information by:
1. Taking a photo of a transit vehicle
2. Sending the location where the photo was taken
3. Providing route information (origin, destination, price)

The submissions go to an admin dashboard for approval before being saved to the database.

## Cloudflare R2 Setup

### Step 1: Create R2 Bucket
1. Go to Cloudflare Dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket (e.g., `doodee-move-transit-images`)

### Step 2: Enable Public Access
1. In your bucket settings, go to "Settings"
2. Under "Public Access", click "Allow Access"
3. Copy the public URL (e.g., `https://pub-xxxxx.r2.dev`)

### Step 3: Create API Token
1. In R2 dashboard, go to "Manage R2 API Tokens"
2. Create a new API token with:
   - **Permissions**: Object Read & Write
   - **Scope**: Specific bucket (your transit images bucket)
3. Copy:
   - Account ID
   - Access Key ID
   - Secret Access Key

### Step 4: Configure Environment Variables
Add to your `.env` file:
```env
R2_ACCOUNT_ID="your_account_id_here"
R2_ACCESS_KEY_ID="your_access_key_id_here"
R2_SECRET_ACCESS_KEY="your_secret_access_key_here"
R2_BUCKET_NAME="doodee-move-transit-images"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

## Database Migration

Run the migration to add the TransitSubmission table:
```bash
npx prisma migrate deploy
```

Or if developing locally:
```bash
npx prisma migrate dev
```

## LINE Rich Menu Setup

### Button 3 Configuration
Add a third button to your LINE Rich Menu with:
- **Text to send**: `สร้างแผนที่`
- **Label**: สร้างแผนที่ or Build Map
- **Action**: Send message

### Example Rich Menu JSON
```json
{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": true,
  "name": "Doodee Move Menu",
  "chatBarText": "เมนู",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 1686 },
      "action": {
        "type": "message",
        "text": "วิธีการเดินทาง"
      }
    },
    {
      "bounds": { "x": 834, "y": 0, "width": 833, "height": 1686 },
      "action": {
        "type": "message",
        "text": "สถานีรถไฟใกล้ฉัน"
      }
    },
    {
      "bounds": { "x": 1668, "y": 0, "width": 832, "height": 1686 },
      "action": {
        "type": "message",
        "text": "สร้างแผนที่"
      }
    }
  ]
}
```

## Admin Dashboard

Access the admin dashboard at: `https://your-domain.com/admin`

### Features:
- View all submissions (pending, approved, rejected)
- Filter by status
- Click images to zoom in
- View location on Google Maps
- Approve or reject submissions

### Admin Actions:
- **Approve**: Marks submission as approved, saves to database
- **Reject**: Marks submission as rejected

## User Flow

### Step 1: User presses "สร้างแผนที่" button
Bot responds:
```
🗺️ สร้างแผนที่ขนส่งสาธารณะ

ขั้นตอนที่ 1/3: ถ่ายรูปยานพาหนะ

📸 โปรดถ่ายรูปยานพาหนะขนส่งสาธารณะ...
```

### Step 2: User sends image
- Image is received by LINE webhook
- Image is fetched from LINE servers
- Image is uploaded to Cloudflare R2
- Public URL is saved to session
- Bot asks for location

### Step 3: User sends location
- Location coordinates are saved to session
- Bot asks for route description

### Step 4: User types description
Example: `"หน้าโรงเรียนอัสสัมชัญธนบุรี มีรถสองแถวไปเดอะมอลบางแค ราคา 8 บาท"`

- Submission is created in database with status "pending"
- Admin receives notification (via dashboard)

### Step 5: Admin reviews
- Admin logs into dashboard
- Reviews image, location, and description
- Approves or rejects submission

## API Endpoints

### POST /api/upload-image
Uploads an image to Cloudflare R2.

**Request:**
```json
{
  "imageBase64": "base64_encoded_image_data",
  "lineUserId": "user_line_id",
  "messageId": "line_message_id"
}
```

**Response:**
```json
{
  "imageUrl": "https://pub-xxxxx.r2.dev/transit-images/..."
}
```

### GET /api/admin/submissions?status=pending
Fetches transit submissions filtered by status.

**Response:**
```json
{
  "submissions": [
    {
      "id": "...",
      "lineUserId": "...",
      "displayName": "User Name",
      "imageUrl": "https://...",
      "latitude": 13.7563,
      "longitude": 100.5018,
      "description": "...",
      "status": "pending",
      "createdAt": "2026-03-05T...",
      "reviewedAt": null,
      "reviewedBy": null
    }
  ]
}
```

### PATCH /api/admin/submissions
Approve or reject a submission.

**Request:**
```json
{
  "id": "submission_id",
  "action": "approve" // or "reject"
}
```

**Response:**
```json
{
  "submission": { ...updated_submission }
}
```

## Security Considerations

### R2 Bucket
- Images are publicly accessible via R2 public URL
- Consider adding authentication if needed
- Set up CORS if accessing from different domains

### Admin Dashboard
- Currently no authentication (add authentication in production!)
- Consider adding admin login system
- Implement role-based access control

### Rate Limiting
- Consider adding rate limiting to prevent abuse
- Limit submissions per user per day
- Add image size validation

## Troubleshooting

### Images not uploading
1. Check R2 credentials in `.env`
2. Verify bucket exists and has public access
3. Check API token permissions
4. Look for errors in server logs

### Admin dashboard not loading submissions
1. Check database connection
2. Verify Prisma schema is up to date (`npx prisma generate`)
3. Check API endpoint responses in browser DevTools

### LINE bot not receiving images
1. Verify webhook URL is correct
2. Check LINE channel access token
3. Ensure bot has necessary permissions

## Future Enhancements

1. **Image compression** before uploading to R2
2. **Duplicate detection** to prevent spam
3. **User reputation system** for trusted contributors
4. **Automated approval** for trusted users
5. **Search feature** in admin dashboard
6. **Export data** to CSV/JSON
7. **Statistics dashboard** for admin
8. **Notification system** for new submissions
