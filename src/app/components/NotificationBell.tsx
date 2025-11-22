"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

type NotificationBellProps = {
    count?: number;
    className?: string;
    badgeClassName?: string;
    iconClassName?: string;
};

const DEFAULT_COUNT = 3;
const baseContainerClass = "relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/70 border border-white/10 backdrop-blur-md shadow-md transition-transform hover:scale-105";
const baseBadgeClass = "absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#EC1D99] px-1 text-[10px] font-bold";
const baseIconClass = "w-5 h-5 text-white";

export default function NotificationBell({ count, className, badgeClassName, iconClassName }: NotificationBellProps) {
    const pathname = usePathname();
    const notificationCount = typeof count === "number" ? count : DEFAULT_COUNT;

    const containerClassName = [baseContainerClass, className].filter(Boolean).join(" ");
    const badgeClassNameFinal = [baseBadgeClass, badgeClassName].filter(Boolean).join(" ");
    const iconClassNameFinal = [
        `${baseIconClass} ${pathname === "/activity" ? "text-[#EC1D99]" : "text-white"}`,
        iconClassName,
    ].filter(Boolean).join(" ");

    return (
        <Link href="/activity" aria-label="Notifications" className={containerClassName}>
            <Bell strokeWidth={1.6} className={iconClassNameFinal} />
            {notificationCount > 0 && (
                <span className={badgeClassNameFinal}>
                    {notificationCount > 9 ? "9+" : notificationCount}
                </span>
            )}
        </Link>
    );
}
