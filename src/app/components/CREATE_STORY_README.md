# Create Story Component - Weeve

A fully-featured React mobile app screen for creating collaborative stories in the Weeve app. This component provides a clean, intuitive form interface for users to initiate new storytelling experiences.

## Features

✅ **Mobile-First Design**
- Optimized for 375px mobile viewport
- Responsive layout scaling to tablet (768px+) and desktop
- Sticky header and footer for easy navigation

✅ **Form Validation**
- Real-time character counters (title: 60 chars, description: 200 chars)
- Required field validation (title is mandatory)
- Conditional validation based on selected story mode

✅ **Dynamic Mode Selection**
- Two story modes: "Invite Specific People" and "Open to All"
- Conditional fields that show/hide based on selected mode
- Seamless mode switching with automatic field reset

✅ **Friend Selection (Invite Mode)**
- Searchable friend list dropdown
- Multi-select capability (max 10 friends)
- Visual friend tags/chips with removal option
- Recommended 3-10 friends guidance
 - **Invite Slots Slider**: Select the number of contributors (1-10) and visual slot indicators show selected participants in order.

- **Contributors Summary**: The number of contributors is the main concept and is shown prominently at the top of the form — it reflects invite slots (Invite mode) or the maximum contributors (Open mode).

✅ **Max Weeves Configuration (Open Mode)**
- Optional number input field
- Auto-constraining between 5-100
- Description of functionality

✅ **Accessibility**
- Proper label associations with all inputs
- WCAG AA compliant contrast ratios
- Clear focus states with Magenta highlight
- Descriptive error messages
- Keyboard navigable

✅ **State Management**
- React hooks (useState) for form state management
- Real-time validation feedback
- Loading states during submission
- Error handling and display

## Additional UI

- ✅ **Bottom Navigation**: A persistent, mobile-first bottom navigation (TikTok-style) exists across the app with Home, Search, Create, Inbox, and Profile. It hides on pages with a dedicated footer (e.g., Create Story).

## Design Specifications

### Colors
- **Primary CTA (Magenta):** #EC1D99
- **Header (Purple):** #9333EA
- **Background (Light):** #F9FAFB
- **Text (Dark):** #1F2937
- **Borders (Light Gray):** #E5E7EB
- **Tags Background (Light Pink):** #FDF2F8

### Typography
- **Headlines:** Poppins (Bold, Medium)
- **Body Text:** Inter (Regular)

### Layout
- **Mobile width:** 375px
- **Max content width:** 500px (tablet), 600px+ (desktop)
- **Section spacing:** 24px between major sections
- **Input padding:** 12px
- **Form padding:** 16px top/bottom, 16px left/right
- **Button padding:** 14px 32px (Create) / 12px 24px (Cancel)

## Component Structure

```
CreateStory Component
├── Header
│   ├── Back Button
│   └── Title "Create Story"
├── Form Section (Scrollable)
│   ├── Contributors Summary (Prominent at top)
│   ├── Story Title Input
│   ├── Story Description Input
│   ├── Story Mode Selection
│   ├── Conditional Fields
│   │   ├── Friends Multi-Select (if Invite mode)
│   │   └── Max Weeves Number Input (if Open mode)
│   └── Error Message Display
└── Button Section (Sticky Footer)
    ├── Cancel Button
    └── Create Story Button
```

## Props

```typescript
interface CreateStoryProps {
  onBack: () => void;  // Callback when back button is clicked
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;  // Callback for form submission
  availableFriends?: Friend[];  // Optional array of friend objects
}

interface Friend {
  id: string;
  name: string;
}

interface CreateStoryFormState {
  title: string;  // Story title (max 60 chars)
  description: string;  // Story description (max 200 chars)
  mode: 'invite' | 'open';  // Story mode
  selectedFriends: Friend[];  // Selected friends (if invite mode)
  maxWeeves: string;  // Max weeves (if open mode)
  hashtags?: string[]; // Optional hashtags
}
```

## Usage

### Basic Implementation

```tsx
import CreateStory from '@/app/components/CreateStory';

export default function Page() {
  const handleBack = () => {
    // Navigate back or close
  };

  const handleCreateStory = async (data) => {
    // Call your API to create the story
    const response = await fetch('/api/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create story');
    
    // Navigate to "Add First Weeve" screen
  };

  return (
    <CreateStory 
      onBack={handleBack} 
      onCreateStory={handleCreateStory}
      availableFriends={friendsList}
    />
  );
}
```

### With Default Friends

The component includes 8 default friends for demonstration purposes. Replace with your actual user's friend list:

```tsx
const myFriends = [
  { id: '1', name: 'Alice Johnson' },
  { id: '2', name: 'Bob Smith' },
  // ... more friends
];

<CreateStory 
  onBack={handleBack} 
  onCreateStory={handleCreateStory}
  availableFriends={myFriends}
/>
```

## Form Validation Rules

| Field | Rule | Error Message |
|-------|------|----------------|
| Title | Required, min 1 char | "Story title is required" |
| Description | Optional, max 200 chars | Auto-truncated |
| Mode | Required | Selected by default |
| Friends (Invite) | Min 1 friend | "Please add at least one friend to invite" |
| Max Weeves (Open) | Optional, 5-100 | Auto-constrained |

## Styling

The component uses **Tailwind CSS** with custom hex colors applied via inline styles for exact brand color matching. All styling is responsive and mobile-first.

### Responsive Breakpoints
- **Mobile (< 640px):** Full width with padding
- **Tablet (640px - 1024px):** Centered form, max-width 500px
- **Desktop (> 1024px):** Centered form, max-width 600px

### Button States

**Create Story Button:**
- **Default:** Magenta background (#EC1D99)
- **Hover:** Darker magenta (#D41C84)
- **Disabled:** 50% opacity, no cursor change
- **Loading:** Shows spinner icon with "Creating..." text

**Cancel Button:**
- **Default:** White background, gray border
- **Hover:** Light gray background
- **Disabled:** 50% opacity

## Interactive Features

✨ **Real-time Character Counters**
- Updates as user types
- Visually shows current/max characters
- Auto-truncates to max length

✨ **Dropdown Friend Search**
- Filters available friends as user types
- Excludes already-selected friends
- Auto-closes when friend is selected
- Shows max 48px height with scroll

✨ **Friend Chips**
- Visual representation of selected friends
- Easy removal via "×" button
- Shows count of selected friends

✨ **Loading State**
- Button shows spinner and "Creating..." text
- Prevents multiple submissions
- Input fields are disabled during submission

✨ **Error Handling**
- Clear error messages displayed at top of form
- Errors are cleared when user modifies fields
- Form remains accessible after error

## Browser Support

- Modern browsers with ES2017+ support
- React 19+
- Tailwind CSS 4+

## Accessibility Features

- ✅ Proper `<label>` associations with `htmlFor`
- ✅ Semantic HTML elements
- ✅ ARIA labels for icon-only buttons
- ✅ Focus states with visible indicators
- ✅ Color contrast ratios exceed WCAG AA standards
- ✅ Keyboard navigable (Tab, Enter, Space)
- ✅ Screen reader friendly error messages

## Dependencies

- **React** (19.2.0+)
- **Tailwind CSS** (4+)
- **lucide-react** (for ChevronLeft and Loader icons)

## File Location

`src/app/components/CreateStory.tsx`

## Demo Page

A demo page is available at `src/app/create-story/page.tsx` that shows the component in action with:
- Success state confirmation screen
- Data display showing created story details
- Ability to create another story

Access it at `/create-story` in your development environment.

## Future Enhancements

Potential improvements for future versions:
- Image upload for story thumbnail
- Category/tag selection
- Privacy settings (public/private/friends-only)
- Story templates or prompts
- Scheduling (publish time, start time for weeves)
- Rich text editor for description
 - Rich text editor for description
 - ✅ Hashtag support (implemented)
- Story collaboration rules/guidelines

---

**Component Version:** 1.0.0  
**Last Updated:** November 19, 2025  
**Created for:** Weeve Collaborative Storytelling Platform
