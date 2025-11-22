import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string | null;
    photoURL: string | null;
    tokens: number;
    createdAt: any;
    updatedAt: any;
    profileCompleted: boolean;
}

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
    uid: string,
    displayName: string,
    email: string | null,
    photoURL: string | null = null
): Promise<void> {
    const userRef = doc(db!, 'users', uid);

    const userProfile: UserProfile = {
        uid,
        displayName,
        email,
        photoURL,
        tokens: 100, // Initial token balance
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profileCompleted: true,
    };

    await setDoc(userRef, userProfile);
}

/**
 * Check if a user profile exists in Firestore
 */
export async function userProfileExists(uid: string): Promise<boolean> {
    try {
        const userRef = doc(db!, 'users', uid);
        const userSnap = await getDoc(userRef);
        return userSnap.exists();
    } catch (error) {
        console.error('[Firestore] Error checking profile:', error);
        return false;
    }
}

/**
 * Get user profile data from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db!, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    }

    return null;
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
): Promise<void> {
    const userRef = doc(db!, 'users', uid);

    await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}
