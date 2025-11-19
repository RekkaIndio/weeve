# Weeve "Create Story" Component - Design & Implementation Guide

## Overview

The **Create Story** component is a production-ready React form interface for initiating collaborative storytelling experiences in the Weeve app. It provides an intuitive, mobile-first user experience with comprehensive form validation, state management, and accessibility features.

---

## 1. Component Architecture

### Component Structure

```
CreateStory (React Functional Component)
├── State Management
│   ├── formState (CreateStoryFormState)
│   ├── isLoading (boolean)
│   ├── error (string)
│   ├── friendSearchInput (string)
│   └── showFriendDropdown (boolean)
├── Computed Values
│   ├── isCreateDisabled
│   ├── filteredFriends
├── Event Handlers
│   ├── handleTitleChange
│   ├── handleDescriptionChange
│   ├── handleModeChange
│   ├── handleAddFriend
│   ├── handleRemoveFriend
│   ├── handleMaxWeevesChange
│   ├── handleAddHashtag
│   ├── handleRemoveHashtag
│   └── handleCreateStory
└── JSX Structure
    ├── Header
    ├── Main Form (Scrollable)
    └── Button Section (Sticky Footer)
```

### State Schema

```typescript
interface CreateStoryFormState {
  title: string;                           // User's story title (0-60 chars)
  description: string;                     // Optional story description (0-200 chars)
  mode: 'invite' | 'open';                 // Story creation mode
  selectedFriends: Friend[];               // Selected friends (invite mode only)
  maxWeeves: string;                       // Max contributors (open mode only)
  hashtags?: string[];                     // Optional hashtags (normalized, lowercase, no leading #)
}

interface Friend {
  id: string;
  name: string;
}

// Component-level state
const [formState, setFormState] = useState<CreateStoryFormState>({...})
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');
const [friendSearchInput, setFriendSearchInput] = useState('');
const [showFriendDropdown, setShowFriendDropdown] = useState(false);
```

---

## 2. Design System

### Color Palette

| Element | Color | Hex Value | Usage |
|---------|-------|-----------|-------|
| Primary CTA (Magenta) | Brand Magenta | #EC1D99 | Create button, focus states, highlights |
| Header/Accent (Purple) | Brand Purple | #9333EA | Headers, titles, brand accent |
| Dark Text | Charcoal | #1F2937 | Primary text, form inputs |
| Light Gray Text | Gray | #9CA3AF | Counters, helper text, descriptions |
| Light Background | Off-White | #F9FAFB | Page background |
| Input Border | Light Gray | #E5E7EB | Input borders, dividers |
| Success/Tags BG | Light Pink | #FDF2F8 | Friend chips, success elements |
| Dark Magenta (Hover) | Darker Magenta | #D41C84 | Button hover state |

### Typography

| Element | Font | Weight | Size | Usage |
|---------|------|--------|------|-------|
| Page Title | Poppins | Bold (700) | 24px | Main header "Create Story" |
| Labels | Poppins | Medium (500) | 14px | Form field labels |
| Buttons | Poppins | Bold (700) / Medium (500) | 16px / 14px | Action buttons |
| Body Text | Inter | Regular (400) | 14px | Input placeholders, regular text |
| Helper Text | Inter | Regular (400) | 12px | Counters, descriptions, sub-text |

### Spacing & Layout

```
Header:           Fixed, 4px padding (16px total)
Form Container:   16px padding on x-axis, 24px between sections
Section Spacing:  24px between major form sections
Input Padding:    12px (horizontal & vertical)
Label → Input:    8px vertical gap
Button Section:   Sticky footer, 16px padding all sides
```

### Border Radius

- Inputs & Buttons: 8px
- Friend chips: Full (border-radius: 9999px)
- Dropdowns: 8px

---

## 3. Functional Flows

### 3.1 Form Submission Flow

```
User clicks "Create Story"
  ↓
[Validation]
  ├─ Is title empty? → Show "Story title is required" error
  ├─ Is invite mode? Is at least 1 friend selected? → Show error if not
  └─ All validations pass?
  ↓
[Set Loading State]
  ├─ Disable all inputs
  ├─ Show spinner in button
  ├─ Change button text to "Creating..."
  ↓
[Call onCreateStory callback with formState]
  ├─ Success → Component consumer navigates to next screen
  └─ Error → Display error message, re-enable form
```

### 3.2 Mode Selection Flow

```
User selects Story Mode (Invite vs Open)
  ↓
[handleModeChange triggered]
  ├─ Update mode in formState
  ├─ Clear selectedFriends array
  ├─ Clear maxWeeves value
  ├─ Clear any existing error
  ↓
[Conditional rendering updates]
  ├─ If "Invite" → Show friend selector
  └─ If "Open" → Show max weeves input
```

### 3.3 Friend Selection Flow

```
User types in friend search input
  ↓
[Filter computation]
  ├─ Exclude already-selected friends
  ├─ Match search term (case-insensitive)
  ├─ Show filtered results in dropdown
  ↓
User clicks a friend
  ↓
[handleAddFriend triggered]
  ├─ Check if < 10 friends selected
  ├─ Add friend to selectedFriends array
  ├─ Clear search input
  ├─ Close dropdown
  ├─ Update UI with new chip
  ↓
User clicks "×" on friend chip
  ↓
[handleRemoveFriend triggered]
  ├─ Remove friend from selectedFriends array
  ├─ Update UI
```

### 3.4 Character Counter Flow

```
User types in title/description input
  ↓
[onChange handler triggered]
  ├─ Slice value to max length (60 for title, 200 for description)
  ├─ Update formState
  ├─ Clear any existing error
  ↓
[UI Updates]
  ├─ Input shows new value
  ├─ Counter updates: "X/60" or "X/200"

### 3.5 Hashtag Input Flow

```
User types a hashtag into the input
  ↓
[On Enter or comma press] or Add button
  ├─ normalize tag (strip `#`, trim, lowercase)
  ├─ validate length (max 30 characters)
  ├─ validate uniqueness (no duplicates)
  ├─ validate count (max 10)
  ├─ append to `formState.hashtags`
  └─ clear hashtag input

[UI Updates]
  ├─ Show tags as chips with `#` prefix
  ├─ Allow removing tags via `×`
```
```

---

## 4. Validation Rules

### Form-Level Validation

| Field | Rule | When | Error Message |
|-------|------|------|----------------|
| Title | Required, min 1 char | On submit | "Story title is required" |
| Description | Optional | - | Auto-truncated to 200 chars |
| Mode | Always set (default: 'invite') | - | N/A |
| Friends | Min 1 if invite mode | On submit | "Please add at least one friend to invite" |
| Max Weeves | Optional, 5-100 if provided | - | Auto-constrained |

### Field-Level Validation

**Title Input:**
- Max 60 characters (enforced via slice in onChange)
- Auto-truncates on paste
- Real-time character counter

**Description Input:**
- Max 200 characters (enforced via slice in onChange)
- Auto-truncates on paste
- Real-time character counter

**Max Weeves Input:**
- Only numeric input accepted (regex: /^\d+$/)
- Minimum: 5
- Maximum: 100
- Auto-constrains on input (converts "3" to "5", "150" to "100")

**Friends:**
- Minimum: 1 (if invite mode selected)
- Maximum: 10
- Input disabled when max reached
- Dropdown filters out already-selected friends

---

## 5. User Interactions & States

### Button States

#### Create Story Button

| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | Magenta bg, white text, cursor pointer | Ready to submit |
| Hover | Darker magenta (#D41C84) | Visual feedback |
| Loading | Magenta bg, white text, spinner icon | "Creating..." text, disabled |
| Disabled (empty title) | 50% opacity, cursor not-allowed | Cannot submit |

#### Cancel Button

| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | White bg, gray border, gray text | Ready to cancel |
| Hover | Light gray background | Visual feedback |
| Disabled | 50% opacity | Disabled during submission |

### Input Focus States

All inputs show:
- Magenta border (#EC1D99)
- Focus ring with magenta color (ring-1 ring-[#EC1D99])
- Smooth transition on focus

### Friend Dropdown

- Appears on input focus
- Disappears on blur (with 200ms delay for click handling)
- Max height: 192px (12rem) with scroll
- Shows only unselected, search-matching friends

### Friend Chips

- Light pink background (#FDF2F8)
- Dark text (#1F2937)
- "×" button on right
- Full rounded corners
- Hover effect on × button (color changes to magenta)

---

## 6. Responsive Design

### Mobile-First Approach

#### Mobile (< 640px)
- Full width with 16px horizontal padding
- All form sections stack vertically
- Header is sticky
- Button section is sticky at bottom
- Input fields take 100% width

#### Tablet (640px - 1024px)
- Form centered with max-width: 500px
- Content margins auto for centering
- Same responsive behavior as mobile otherwise

#### Desktop (> 1024px)
- Form centered with max-width: 600px+
- Wider spacing comfortable for mouse/trackpad input
- Same responsive behavior as tablet

### Scrolling Behavior

```
┌─────────────────────────┐
│ Header (sticky)         │
├─────────────────────────┤
│                         │
│ Form Content (scrollable)
│                         │
├─────────────────────────┤
│ Button Section (sticky) │
└─────────────────────────┘
```

- Header: `position: sticky; top: 0; z-index: 10`
- Main: `flex-1 overflow-y-auto pb-28` (padding-bottom to prevent overlap with sticky footer)
- Footer: `position: fixed; bottom: 0; z-index: auto`

---

## 7. Error Handling

### Error Display

- Error message shows in a red alert box at top of form
- Message is descriptive (e.g., "Please add at least one friend to invite")
- Error clears when user modifies relevant field
- Error container has:
  - Light red background (#FEE2E2)
  - Red border (#FCA5A5)
  - Red text (#B91C1C)

### Error Types

1. **Validation Error**: "Story title is required"
2. **Validation Error**: "Please add at least one friend to invite"
3. **API Error**: Custom message from onCreateStory callback
4. **Network Error**: "Failed to create story. Please try again."

### Error Recovery

- Form remains in view
- All inputs retain their values
- User can fix issue and retry
- Error clears when user interacts with affected field

---

## 8. Accessibility Features

### WCAG Compliance

✅ **Level AA Compliance Implemented:**
- Color contrast ratios > 4.5:1 for text
- Focus indicators (magenta borders)
- Proper heading hierarchy
- Semantic HTML structure

### Implementation Details

```typescript
// Proper label associations
<label htmlFor="title">Story Title</label>
<input id="title" {...} />

// ARIA labels for icon buttons
<button aria-label="Go back">
  <ChevronLeft />
</button>

// Semantic form structure
<form>
  <fieldset>
    <legend>Story Mode</legend>
    <input type="radio" id="mode-invite" />
    <label htmlFor="mode-invite">Invite Specific People</label>
  </fieldset>
</form>

// Descriptive error messages
{error && (
  <div role="alert">
    <p>{error}</p>
  </div>
)}
```

### Keyboard Navigation

- Tab through all interactive elements
- Enter to submit form
- Space to toggle radio buttons
- Escape to close dropdown
- Arrow keys work in friend dropdown

### Screen Reader Support

- All inputs have associated labels
- Form sections are semantic (`<label>`, `<input>`, `<textarea>`)
- Error messages are marked with `role="alert"`
- Icon buttons have `aria-label`
- Helper text is properly associated with inputs

---

## 9. Component Props & Callbacks

### Props

```typescript
interface CreateStoryProps {
  // Callback when user clicks back button
  onBack: () => void;
  
  // Callback when user submits the form
  // Should throw an error if submission fails
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;
  
  // Optional array of available friends
  // Defaults to sample friends if not provided
  availableFriends?: Friend[];
}
```

### Callback Return Values

**onCreateStory**: Expects a Promise
- Resolves on success
- Rejects/throws on error
- Component handles loading state during promise

---

## 10. Integration Guide

### Basic Integration

```tsx
import CreateStory from '@/app/components/CreateStory';
import { useRouter } from 'next/navigation';

export default function CreateStoryPage() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);

  // Fetch user's friends on mount
  useEffect(() => {
    fetchUserFriends().then(setFriends);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleCreateStory = async (formData) => {
    const response = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create story');
    }

    const story = await response.json();
    router.push(`/stories/${story.id}/add-weeve`);
  };

  return (
    <CreateStory
      onBack={handleBack}
      onCreateStory={handleCreateStory}
      availableFriends={friends}
    />
  );
}
```

### API Contract Expected

```typescript
// POST /api/stories
Request: {
  title: string;
  description: string;
  mode: 'invite' | 'open';
  selectedFriends?: Array<{ id: string; name: string }>;
  maxWeeves?: number;
}

Response (Success): {
  id: string;
  title: string;
  description: string;
  mode: 'invite' | 'open';
  createdAt: string;
  // ... other story fields
}

Response (Error): {
  message: string;
  code?: string;
}
```

---

## 11. Performance Optimizations

### Memoization Opportunities

Current implementation uses direct state updates. For optimization in high-frequency scenarios:

```typescript
// Optional: Memoize friend filtering
const filteredFriends = useMemo(() => {
  return availableFriends.filter(friend => {
    const isSelected = formState.selectedFriends.some(f => f.id === friend.id);
    const matchesSearch = friend.name
      .toLowerCase()
      .includes(friendSearchInput.toLowerCase());
    return !isSelected && matchesSearch;
  });
}, [availableFriends, formState.selectedFriends, friendSearchInput]);

// Optional: Memoize handlers
const handleTitleChange = useCallback((e) => {
  // handler logic
}, []);
```

### Render Optimization

- Conditional rendering (invite vs open mode sections)
- Dropdown only renders when needed
- Error message only renders when present
- Loading state uses spinner icon (CSS-animated)

---

## 12. Testing Considerations

### Unit Test Scenarios

```typescript
describe('CreateStory Component', () => {
  // Form State Tests
  test('should update title with max 60 characters');
  test('should update description with max 200 characters');
  test('should toggle between invite and open modes');
  
  // Friend Selection Tests
  test('should add friend to selectedFriends array');
  test('should remove friend from selectedFriends array');
  test('should limit selected friends to maximum 10');
  test('should filter friends by search term');
  
  // Validation Tests
  test('should show error when title is empty on submit');
  test('should show error when no friends selected in invite mode');
  test('should disable create button when title is empty');
  
  // Callback Tests
  test('should call onBack when back button clicked');
  test('should call onCreateStory with correct payload');
  test('should show loading state during submission');
  test('should show error message on submission failure');
  
  // UI Tests
  test('should show friend selector in invite mode');
  test('should show max weeves input in open mode');
  test('should render character counters');
  test('should show friend chips with remove buttons');
});
```

### E2E Test Scenarios

1. Complete invite flow: Create title → Add description → Select mode → Add friends → Submit
2. Complete open flow: Create title → Add description → Select open mode → Set max weeves → Submit
3. Form validation: Try to submit empty title, verify error
4. Friend selection: Add max (10) friends, verify input disables
5. Character limits: Paste long text, verify auto-truncation

---

## 13. Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Required features:
- ES2017 (spread operator, arrow functions, Promise)
- CSS Grid/Flexbox
- CSS Custom Properties (optional, not used)
- Modern React API (Hooks)

---

## 14. Future Enhancement Ideas

### Phase 2 Features
- Image upload for story thumbnail
- Category/tag selection from predefined list
- Story templates or creative prompts
- Scheduling (publish date, weeve start time)

### Phase 3 Features
- Rich text editor for story description
- Hashtag support and autocomplete
- Story collaboration rules/guidelines
- Privacy level selection (public/private/friends-only)
- Contributors summary displayed prominently at the top of the form, showing number of contributors (invite slots or max contributors) and selected count.

### UX Improvements
- Auto-save draft to localStorage
- Friend suggestions based on past collaborations
- Quick templates ("Mystery Story", "Love Story", etc.)
- Friend list with mutual friend count
- Story preview before creation

---

## 15. Troubleshooting Guide

### Component Not Rendering
- Verify `lucide-react` package is installed
- Check that `onBack` and `onCreateStory` props are provided
- Verify parent component uses `'use client'` directive

### Styling Not Applied
- Verify Tailwind CSS is configured in `tailwind.config.ts`
- Check `@tailwindcss/postcss` is in dependencies
- Verify hex colors are correct (no spaces in array keys like `[#EC1D99]`)

### Friend Dropdown Not Showing
- Verify `availableFriends` prop is provided with proper structure
- Check `showFriendDropdown` state is true
- Verify z-index on dropdown (set to 20)

### Submit Not Working
- Verify `onCreateStory` callback returns a Promise
- Check that callback doesn't throw synchronously
- Verify form validations pass

---

## Summary

The Create Story component is a complete, production-ready solution for story creation in Weeve. It combines:

- **Intuitive UX**: Mobile-first, responsive design
- **Smart Validation**: Real-time feedback and error handling
- **Accessibility**: WCAG AA compliant with semantic HTML
- **Flexibility**: Customizable friends list, themed colors
- **Reliability**: Proper state management and error recovery
- **Performance**: Optimized renders and smooth interactions

The component is ready for integration with your backend API and can be customized with your actual friend data and story creation endpoint.
