"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { userProfileExists, getUserProfile } from '@/lib/firestore';

interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { setCurrentUser } = useStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('[AuthProvider] Auth state changed:', firebaseUser?.uid || 'null');
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // Check if user profile exists in Firestore
                    console.log('[AuthProvider] Checking if profile exists for:', firebaseUser.uid);
                    const profileExists = await userProfileExists(firebaseUser.uid);
                    console.log('[AuthProvider] Profile exists:', profileExists);

                    if (profileExists) {
                        // Get profile data from Firestore
                        const profile = await getUserProfile(firebaseUser.uid);
                        console.log('[AuthProvider] Profile data:', profile);

                        // Sync Firebase user with app store
                        const appUser = {
                            id: firebaseUser.uid,
                            name: profile?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                            avatar: profile?.photoURL || firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                            tokens: profile?.tokens || 100,
                        };
                        setCurrentUser(appUser);

                        // Redirect to homepage if on auth pages
                        if (pathname === '/login' || pathname === '/signup' || pathname === '/setup') {
                            console.log('[AuthProvider] Redirecting to homepage from:', pathname);
                            setTimeout(() => router.push('/'), 100);
                        }
                    } else {
                        // New user - redirect to setup if not already there
                        if (pathname !== '/setup') {
                            console.log('[AuthProvider] Redirecting new user to setup from:', pathname);
                            setTimeout(() => router.push('/setup'), 100);
                        }
                    }
                } catch (error) {
                    console.error('[AuthProvider] Error in auth flow:', error);
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [setCurrentUser, router, pathname]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
