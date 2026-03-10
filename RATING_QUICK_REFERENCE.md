# Quick Rating System Commands

## Important Notes

⚠️ **Rate Limiting**: Users can only rate once per 24 hours to prevent spam.

## For Testing

### LINE Bot Commands
Type any of these in your LINE chat with the bot:
- `ให้คะแนน`
- `ให้คะแนนแอป`
- `rate`
- `rating`

### Web Testing (Browser Console)
```javascript
// Reset rating data to test again
localStorage.removeItem('doodee_rating_data')

// Then refresh the page multiple times
```

## View Statistics

### Check Database Directly
```sql
-- View all ratings
SELECT * FROM "UserRating" ORDER BY "createdAt" DESC;

-- Get average
SELECT AVG(rating) as avg, COUNT(*) as total FROM "UserRating";

-- Distribution
SELECT rating, COUNT(*) as count 
FROM "UserRating" 
GROUP BY rating 
ORDER BY rating DESC;

-- Check if user can rate (find recent ratings)
SELECT 
  "lineUserId", 
  "rating", 
  "createdAt",
  NOW() - "createdAt" as "time_since_rating"
FROM "UserRating" 
WHERE "lineUserId" = 'USER_ID_HERE'
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Delete a user's recent rating (for testing)
DELETE FROM "UserRating" 
WHERE "lineUserId" = 'USER_ID_HERE' 
AND "createdAt" >= NOW() - INTERVAL '24 hours';
```

### API Endpoint
```bash
# Get statistics
curl https://your-domain.com/api/rating

# Response format:
{
  "totalRatings": 42,
  "averageRating": 4.5,
  "distribution": {
    "1": 0,
    "2": 1,
    "3": 5,
    "4": 15,
    "5": 21
  }
}
```

### Use React Component
```tsx
import RatingStats from "@/app/components/RatingStats";

// Add to any page
<RatingStats />
```

## Customization

### Change Prompt Frequency (Web)
Edit `app/components/RatingPrompt.tsx`:
```typescript
const SHOW_AFTER_VISITS = 5;        // Number of visits before showing
const DAYS_BETWEEN_PROMPTS = 30;    // Days before asking again
```

### Modify LINE Bot Messages
Edit `app/api/webhook/route.ts` in the rating postback handler for custom thank you messages.

### Add More Commands
Edit `app/api/webhook/route.ts`:
```typescript
if (text === "ให้คะแนน" || text === "YOUR_NEW_COMMAND") {
  const ratingFlex = buildRatingFlex();
  await safeReply(replyToken, [ratingFlex]);
  return;
}
```
