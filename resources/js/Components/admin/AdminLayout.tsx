import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    LayoutDashboard,
    ListChecks,
    Users,
    Package,
    Truck,
    AlertOctagon,
    ShoppingCart,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeft,
    Settings,
    UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { LucideIcon } from 'lucide-react';
import type { PageProps } from '@/types';

interface NavItemData {
    name: string;
    href: string;
    icon: LucideIcon;
}

interface NavGroup {
    label: string;
    color: string;
    textColor: string;
    items: NavItemData[];
}

interface BreadcrumbCrumb {
    label: string;
    href?: string;
}

interface NavItemProps {
    item: NavItemData;
    groupColor: string;
    isActive: boolean;
    renderCollapsed: boolean;
    onNavigate: () => void;
}

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumbs?: BreadcrumbCrumb[];
}

const navGroups: NavGroup[] = [
    {
        label: 'Overview',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: "Today's Tasks", href: '/tasks', icon: ListChecks },
        ],
    },
    {
        label: 'Master Data',
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        items: [
            { name: 'Customers', href: '/customers', icon: Users },
            { name: 'Products', href: '/products', icon: Package },
            { name: 'Transporters', href: '/transporters', icon: Truck },
        ],
    },
    {
        label: 'Operations',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        items: [
            { name: 'Orders', href: '/orders', icon: ShoppingCart },
            { name: 'Returns', href: '/returns', icon: AlertOctagon },
        ],
    },
    {
        label: 'System',
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        items: [
            { name: 'Profile', href: '/profile', icon: UserCog },
            { name: 'Settings', href: '/settings/integrations', icon: Settings },
        ],
    },
];

const SIDEBAR_W = 240;
const SIDEBAR_COLLAPSED_W = 52;

function NavItem({ item, groupColor, isActive, renderCollapsed, onNavigate }: NavItemProps) {
    const Icon = item.icon;
    const link = (
        <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
                'relative flex items-center rounded-md text-[13px]',
                isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                renderCollapsed
                    ? 'justify-center p-2'
                    : 'gap-2.5 px-3 py-1',
            )}
        >
            {renderCollapsed ? (
                <Icon className="h-4 w-4 shrink-0" />
            ) : (
                <>
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isActive ? groupColor : 'bg-muted-foreground/40')} />
                    <span className="whitespace-nowrap">{item.name}</span>
                </>
            )}
        </Link>
    );

    if (renderCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
        );
    }
    return link;
}

export default function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
    const { url, props } = usePage<PageProps>();
    const user = props.auth?.user;

    const [collapsed, setCollapsed] = useState(false);
    const [renderCollapsed, setRenderCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const currentPath = url.split('?')[0];

    const isActive = (href: string): boolean => {
        if (href === '/') return currentPath === '/' || currentPath === '';
        return currentPath.startsWith(href);
    };

    const handleLogout = () => {
        router.post('/logout', {}, {
            onSuccess: () => toast.success('Logged out'),
        });
    };

    const toggleSidebar = () => {
        const next = !collapsed;
        setCollapsed(next);
        setRenderCollapsed(next);
    };

    const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;
    const showCollapsed = renderCollapsed && !mobileOpen;

    const userInitials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';

    const sidebarContent = (
        <>
            {/* Sidebar header */}
            <div className="flex h-12 items-center border-b border-border shrink-0 px-3 gap-2">
                {!showCollapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-tight text-foreground leading-none whitespace-nowrap">OCC</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">GC Communication</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hidden lg:flex',
                        showCollapsed && 'mx-auto',
                    )}
                    onClick={toggleSidebar}
                >
                    {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
            </div>

            {/* Nav */}
            <ScrollArea className="flex-1 py-2">
                <div className={cn('px-2', showCollapsed ? 'space-y-1' : 'space-y-3')}>
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            {!showCollapsed && (
                                <p className={cn(
                                    'mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                                    group.textColor,
                                )}>
                                    {group.label}
                                </p>
                            )}
                            <nav className="flex flex-col gap-0.5">
                                {group.items.map((item) => (
                                    <NavItem
                                        key={item.href}
                                        item={item}
                                        groupColor={group.color}
                                        isActive={isActive(item.href)}
                                        renderCollapsed={showCollapsed}
                                        onNavigate={() => setMobileOpen(false)}
                                    />
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* User footer */}
            <div className="border-t border-border p-2 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                'flex w-full items-center rounded-md py-1.5 text-left text-sm hover:bg-muted',
                                showCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                            )}
                        >
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-[10px] bg-foreground text-primary-foreground">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            {!showCollapsed && (
                                <div className="flex-1 truncate">
                                    <p className="truncate text-xs font-medium text-foreground">{user?.name || 'User'}</p>
                                    <p className="truncate text-[10px] text-muted-foreground">{user?.email || ''}</p>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side={showCollapsed ? 'right' : 'top'} align="start" className="w-48">
                        <div className="px-2 py-1.5">
                            <p className="text-sm font-medium">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile" className="cursor-pointer">
                                <UserCog className="h-4 w-4 mr-2" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                            <LogOut className="h-4 w-4 mr-2" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Toaster />

            {/* Mobile overlay */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-foreground/40 lg:hidden transition-opacity duration-300 ease-out',
                    mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar spacer (reserves desktop space) */}
            <div
                className="hidden lg:block shrink-0"
                style={{
                    width: sidebarWidth,
                    transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background overflow-hidden',
                    mobileOpen
                        ? 'translate-x-0'
                        : '-translate-x-full lg:translate-x-0',
                )}
                style={{
                    width: mobileOpen ? SIDEBAR_W : sidebarWidth,
                    transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms ease-out',
                }}
            >
                {sidebarContent}
            </aside>

            {/* Main */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
                    <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setMobileOpen(true)}>
                        <Menu className="h-4 w-4" />
                    </Button>

                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <Breadcrumb className="min-w-0">
                            <BreadcrumbList className="flex-nowrap">
                                {/* Desktop: show all items */}
                                <BreadcrumbItem className="hidden sm:inline-flex">
                                    <BreadcrumbLink asChild>
                                        <Link href="/" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {breadcrumbs.map((crumb, i) => (
                                    <span key={i} className="contents hidden sm:contents">
                                        <BreadcrumbSeparator className="hidden sm:block" />
                                        <BreadcrumbItem>
                                            {crumb.href ? (
                                                <BreadcrumbLink asChild>
                                                    <Link href={crumb.href} className="text-muted-foreground hover:text-foreground">{crumb.label}</Link>
                                                </BreadcrumbLink>
                                            ) : (
                                                <BreadcrumbPage className="text-foreground truncate max-w-[160px]">{crumb.label}</BreadcrumbPage>
                                            )}
                                        </BreadcrumbItem>
                                    </span>
                                ))}

                                {/* Mobile: ellipsis dropdown + last item only */}
                                {breadcrumbs.length > 1 && (
                                    <BreadcrumbItem className="sm:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="flex items-center gap-1">
                                                <BreadcrumbEllipsis />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuItem asChild>
                                                    <Link href="/">Dashboard</Link>
                                                </DropdownMenuItem>
                                                {breadcrumbs.slice(0, -1).map((crumb, i) => (
                                                    <DropdownMenuItem key={i} asChild>
                                                        <Link href={crumb.href || '#'}>{crumb.label}</Link>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </BreadcrumbItem>
                                )}
                                {breadcrumbs.length === 1 && (
                                    <BreadcrumbItem className="sm:hidden">
                                        <BreadcrumbLink asChild>
                                            <Link href="/" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                )}
                                <BreadcrumbSeparator className="sm:hidden" />
                                <BreadcrumbItem className="sm:hidden min-w-0">
                                    <BreadcrumbPage className="text-foreground truncate">
                                        {breadcrumbs?.[breadcrumbs.length - 1]?.label}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    ) : (
                        title && <h1 className="text-sm font-medium text-foreground">{title}</h1>
                    )}

                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                        OCC · GC Communication
                    </span>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
