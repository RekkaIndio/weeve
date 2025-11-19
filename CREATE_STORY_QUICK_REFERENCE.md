# Create Story Component - Quick Reference

## Files Created

```
src/app/components/
├── CreateStory.tsx                 # Main component file
├── CREATE_STORY_README.md         # User documentation
└── CREATE_STORY_DESIGN.md         # Technical design document

src/app/create-story/
└── page.tsx                       # Demo/example page
```

## Quick Start

### 1. Install Dependencies
```bash
npm install lucide-react
```

### 2. Import Component
```tsx
import CreateStory from '@/app/components/CreateStory';
```

### 3. Implement Basic Usage
```tsx
'use client';

import CreateStory from '@/app/components/CreateStory';
import { useRouter } from 'next/navigation';

export default function MyPage() {
  const router = useRouter();

  const handleBack = () => router.back();

  const handleCreateStory = async (formData) => {
    const res = await fetch('/api/stories', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error('Creation failed');
    router.push('/stories/next-screen');
  };

  return (
    <CreateStory
      onBack={handleBack}
      onCreateStory={handleCreateStory}
    />
  );
}
```

## Component Props

```typescript
interface CreateStoryProps {
  onBack: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;
  availableFriends?: Friend[];
}
```

## Form Data Structure

```typescript
interface CreateStoryFormState {
  title: string;                    // 0-60 chars
  description: string;              // 0-200 chars
  mode: 'invite' | 'open';
  selectedFriends: Friend[];
  maxWeeves: string;
  hashtags?: string[];
}

interface Friend {
  id: string;
  name: string;
}
```

## Key Features Checklist

- ✅ Mobile-first responsive design (375px baseline)
- ✅ Two story modes: "Invite Specific People" & "Open to All"
- ✅ Conditional fields based on selected mode
- ✅ Searchable friend multi-select (max 10)
- ✅ Real-time character counters
- ✅ Form validation with error messages
- ✅ Loading state during submission
- ✅ Sticky header and footer
- ✅ WCAG AA accessibility compliance
 - ✅ Contributors summary prominently shown at the top (main concept)
- ✅ Weeve brand colors (Magenta #EC1D99, Purple #9333EA)

## Color Reference

| Name | Hex | Use |
|------|-----|-----|
| Magenta | #EC1D99 | Primary buttons, focus states |
| Purple | #9333EA | Headers, accents |
| Light Gray | #E5E7EB | Borders |
| Dark Text | #1F2937 | Primary text |
| Light Pink | #FDF2F8 | Friend chip backgrounds |

## Font Reference

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Title | Poppins | Bold | 24px |
| Labels | Poppins | Medium | 14px |
| Body | Inter | Regular | 14px |
| Helper | Inter | Regular | 12px |

## Validation Rules

| Field | Required | Max Length | Rule |
|-------|----------|-----------|------|
| Title | YES | 60 | Must be 1+ chars |
| Description | NO | 200 | Optional |
| Friends (invite) | YES | 10 | Min 1 if invite mode |
| Max Weeves (open) | NO | 100 | Min 5 if provided |

## State Management

All state is local to the component using `useState`. No external state management needed, but you can lift state up if needed:

```typescript
// Current: All state in CreateStory component
const [formState, setFormState] = useState<CreateStoryFormState>({...});
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

// Or lift to parent:
// Pass formState and setFormState as props if parent manages state
```

## Error Handling

The component expects:
- `onCreateStory` to return a Promise
- Promise rejects/throws on error
- Error message extracted from thrown Error or default message

```typescript
const handleCreateStory = async (data) => {
  try {
    await fetch('/api/stories', { body: JSON.stringify(data) });
    // Success - component auto-closes loading state
  } catch (err) {
    throw new Error('Custom error message');
    // Component catches and displays in error box
  }
};
```

## Testing the Component

### View Demo
Navigate to `/create-story` in development environment

### Test Scenarios
1. **Fill form completely** → Click "Create Story" → See success message
2. **Leave title blank** → Click "Create Story" → See error
3. **Switch modes** → Verify correct conditional fields appear
4. **Add max 10 friends** → Verify input disables at max
5. **Type long text** → Verify auto-truncation and counters

## Customization Guide

### Change Default Friends
```tsx
<CreateStory
  availableFriends={[
    { id: '1', name: 'Custom Friend' },
    // ...
  ]}
  onBack={handleBack}
  onCreateStory={handleCreateStory}
/>
```

### Change Colors
Edit hex colors in CreateStory.tsx:
- `#EC1D99` → Magenta (primary CTA)
- `#9333EA` → Purple (headers)
- `#F9FAFB` → Light gray background
- `#1F2937` → Dark text

### Change Fonts
Modify fontFamily inline styles or update Tailwind theme

### Change Limits
- Title max: Search for `slice(0, 60)` → change 60
- Description max: Search for `slice(0, 200)` → change 200
- Friends max: Search for `formState.selectedFriends.length < 10` → change 10
- Max Weeves: Search for `Math.min(Math.max(parseInt(value), 5), 100)` → change 5/100

## Common Patterns

### Redirect After Success
```tsx
const handleCreateStory = async (data) => {
  const res = await fetch('/api/stories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed');
  const story = await res.json();
  router.push(`/stories/${story.id}/add-weeve`); // Redirect
};
```

### Send Additional Data
```tsx
const handleCreateStory = async (data) => {
  const payload = {
    ...data,
    userId: currentUser.id,
    createdAt: new Date(),
  };
  const res = await fetch('/api/stories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
};
```

### Show Custom Error
```tsx
const handleCreateStory = async (data) => {
  try {
    // API call
  } catch (err) {
    throw new Error('Please check your friends list and try again');
  }
};
```

## Accessibility Checklist

- ✅ All inputs have `<label>` elements with `htmlFor`
- ✅ Focus states clearly visible (Magenta borders)
- ✅ Color contrast > 4.5:1
- ✅ Keyboard navigable (Tab, Enter, Space)
- ✅ Error messages in alerts
- ✅ Icon buttons have `aria-label`
- ✅ Form validates before submission
- ✅ Loading state prevents multiple submissions

## Performance Notes

- Component is lightweight (single React file)
- Filtering runs on every keystroke (OK for < 100 friends)
- For 1000+ friends, consider pagination or virtualization
- Spinner animation is CSS-based (efficient)
- No images or heavy assets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations

- Friend list must be provided by parent (no API call in component)
- Max 10 friends is hardcoded (change in component code)
- Max weeves must be 5-100 (hardcoded)
- No image upload for story
- No hashtags or mentions support
 - ✅ Hashtags supported in the Create Story form

## Deployment Checklist

- [ ] Install lucide-react: `npm install lucide-react`
- [ ] Implement `onCreateStory` callback
- [ ] Provide list of user's friends via `availableFriends` prop
- [ ] Test form submission with real API
- [ ] Test error handling
- [ ] Verify responsive design on mobile device
- [ ] Check accessibility with screen reader
- [ ] Update API endpoint if different from `/api/stories`

## Support & Questions

For detailed documentation, see:
- `CREATE_STORY_README.md` - User documentation
- `CREATE_STORY_DESIGN.md` - Technical architecture

For component modifications, refer to the TypeScript interfaces and inline comments in `CreateStory.tsx`.

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** November 19, 2025
