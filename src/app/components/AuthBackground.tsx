import { memo } from "react";

const AuthBackground = memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-[10px] opacity-30">
                <div
                    className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob will-change-transform"
                ></div>
                <div
                    className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000 will-change-transform"
                ></div>
            </div>
        </div>
    );
});

AuthBackground.displayName = "AuthBackground";

export default AuthBackground;
