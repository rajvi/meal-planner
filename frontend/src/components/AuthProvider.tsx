import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

type AuthContextType = {
    session: Session | null | undefined;
    user: User | null | undefined;
    loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
    session: undefined,
    user: undefined,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function getInitialSession() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // Only update state if component is still mounted
            if (mounted) {
                if (session) {
                    setSession(session);
                    setUser(session.user);
                } else {
                    setSession(null);
                    setUser(null);
                }
                setLoading(false);
            }
        }

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session) {
                    setSession(session);
                    setUser(session.user);
                } else {
                    setSession(null);
                    setUser(null);
                }
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        session,
        user,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
