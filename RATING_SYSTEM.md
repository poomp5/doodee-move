# User Rating System Documentation

## Overview
A simple, non-intrusive one-click rating system that collects user feedback about the application's usability. The system automatically prompts users occasionally and saves ratings to the database.

## Features
- ⭐ **One-click rating**: Users can rate with a single click (1-5 stars)
- 💬 **LINE Bot Command**: Type "ให้คะแนน" anytime to rate
- 🎯 **Smart prompting**: Shows after 5 page visits on web, then waits 30 days before asking again
- 💾 **Database storage**: All ratings are stored in PostgreSQL via Prisma
- 📊 **Analytics**: View rating statistics and distribution
- 🔕 **Dismissible**: Users can close the prompt (won't show again for 7 days)
- 🎨 **Beautiful UI**: Smooth animations and hover effects for both web and LINE

## How It Works

### 1. Database Model
The `UserRating` model in Prisma stores:
- `rating`: 1-5 star rating
- `lineUserId`: Optional LINE user ID
- `displayName`: Optional user display name
- `category`: Rating category (default: "usability")
- `userAgent`: Browser/device info for analytics
- `createdAt`: Timestamp

### 2. LINE Bot Command (New!)
Users can trigger rating anytime by typing:
- `ให้คะแนน` (Thai: "Rate")
- `ให้คะแนนแอป`
- `rate`
- `rating`

The bot responds with a Flex Message containing star buttons. When clicked, the rating is saved and user receives a personalized thank you message.

### 3. Web Display Logic
The rating prompt appears when:
- User has visited at least **5 pages**
- Either:
  - Never rated before, OR
  - 30 days have passed since last rating
- Either:
  - Never dismissed, OR
  - 7 days have passed since last dismissal

### 4. User Flow (Web)
1. User navigates the app normally
2. After 5 page visits, the rating modal appears (with 2 second delay)
3. User clicks a star (1-5) to rate
4. Rating is saved to database
5. Success message shows briefly
6. Modal closes automatically

### 5. User Flow (LINE Bot)
1. User types "ให้คะแนน"
2. Bot sends a beautiful Flex Message with 1-5 star buttons
3. User clicks their rating
4. Rating is instantly saved to database
5. Bot replies with personalized thank you message based on rating

## Files Created

### Components
- `app/components/RatingModal.tsx` - The rating UI modal for web
- `app/components/RatingPrompt.tsx` - Logic for when to show the web modal
- `app/components/RatingStats.tsx` - Admin view of rating statistics

### API & LINE Bot
- `app/api/rating/route.ts` - API endpoint for saving/retrieving ratings
  - `POST /api/rating` - Save a new rating
  - `GET /api/rating` - Get rating statistics
- `app/api/webhook/route.ts` - Updated with rating command handler
  - Text command: "ให้คะแนน", "rate", "rating", "ให้คะแนนแอป"
  - Postback handler: Saves rating when user clicks star button
- `lib/flex.ts` - Added `buildRatingFlex()` for LINE Flex Message

### Database
- `prisma/schema.prisma` - Added `UserRating` model
- Migration: `20260310104103_add_user_rating`

### Styling
- `app/globals.css` - Added `fadeIn` and `scaleIn` animations

## Customization

### Change Prompt Frequency
Edit `app/components/RatingPrompt.tsx`:

```typescript
const SHOW_AFTER_VISITS = 5; // Change this number
const DAYS_BETWEEN_PROMPTS = 30; // Days before asking again
```

### Change Question or Labels
Edit `app/components/RatingModal.tsx`:

```typescript
<h2 className="text-2xl font-bold text-gray-800 mb-2">
  How easy was it to use? // Change this text
</h2>
```

### Add More Rating Categories
You can create multiple rating categories:

```typescript
// Example: Rate different aspects
await fetch("/api/rating", {
  method: "POST",
  body: JSON.stringify({
    rating: 5,
    category: "feature-quality" // or "design", "performance", etc.
  })
});
```

## Viewing Statistics

### Option 1: Use the RatingStats Component
Add to any admin page:

```tsx
import RatingStats from "@/app/components/RatingStats";

export default function AdminPage() {
  return (
    <div>
      <RatingStats />
    </div>
  );
}
```

### Option 2: Direct API Call
```bash
curl https://your-domain.com/api/rating
```

## Testing the Rating System

### LINE Bot Command (Easiest Method)
The quickest way to test the rating system:
1. Open your LINE chat with the Doodee Move bot
2. Type: **`ให้คะแนน`** (or `rate`, `rating`, `ให้คะแนนแอป`)
3. A beautiful rating card will appear
4. Click on any star rating (1-5 stars)
5. Get instant confirmation message

This command works anytime, regardless of visit count!

### Quick Test (Skip Visit Count)
Temporarily edit `RatingPrompt.tsx`:

```typescript
// Change this:
data.visitCount >= SHOW_AFTER_VISITS

// To this:
data.visitCount >= 1 // Show after just 1 visit
```

### Reset Your Rating
Open browser console and run:
```javascript
localStorage.removeItem('doodee_rating_data')
```
Then refresh the page.

### Test Different Ratings
1. Rate the app
2. Clear localStorage
3. Rate again with a different star count
4. View statistics with `<RatingStats />` component

## Database Queries

### Get all ratings
```sql
SELECT * FROM "UserRating" ORDER BY "createdAt" DESC;
```

### Get average rating
```sql
SELECT AVG(rating) as average FROM "UserRating";
```

### Get ratings by user
```sql
SELECT * FROM "UserRating" 
WHERE "lineUserId" = 'your-user-id'
ORDER BY "createdAt" DESC;
```

### Get recent ratings (last 7 days)
```sql
SELECT * FROM "UserRating" 
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

## Privacy Considerations

The system is designed with privacy in mind:
- ✅ Can collect ratings anonymously (no lineUserId required)
- ✅ No personal data is mandatory
- ✅ User can dismiss the prompt
- ✅ Data stored locally to track prompt frequency

To make it fully anonymous, modify the API call in `RatingPrompt.tsx`:

```typescript
// Remove user identification:
body: JSON.stringify({
  rating,
  // lineUserId: undefined, // Don't send
  // displayName: undefined, // Don't send
  category: "usability",
})
```

## Next Steps

Consider adding:
1. **Admin Dashboard**: Create a full admin page with rating analytics
2. **Email Alerts**: Notify admin when receiving low ratings (1-2 stars)
3. **Text Feedback**: Add optional text input for detailed feedback
4. **Export Data**: Add CSV export functionality
5. **Charts**: Visualize rating trends over time
6. **A/B Testing**: Test different prompt timings and messages

## Support

The rating system is fully integrated and ready to use. It will automatically start collecting feedback as users navigate your app!
