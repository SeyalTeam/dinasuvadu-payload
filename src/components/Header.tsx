"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type HeaderProps = {
  categories: Category[];
  homepageCategories?: Category[];
};

function ChevronIcon({
  size = 14,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function Header({ categories, homepageCategories }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [underlineWidth, setUnderlineWidth] = useState(24);
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLUListElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    // Use the same key as InitTheme / ThemeProvider so both systems stay in sync
    localStorage.setItem("payload-theme", newTheme);
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) setSearchQuery("");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery)}`);
      setSearchVisible(false);
      setDrawerVisible(false); // Also close drawer if search from drawer
    }
  };

  const categoryOrder: { [key: string]: number } = {
    செய்திகள்: 0,
    தமிழ்நாடு: 1,
    இந்தியா: 2,
    உலகம்: 3,
  };

  // Organize categories into parents and children
  const parentCategories = categories.filter(c => !c.parent);
  const subCategories = categories.filter(c => c.parent);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  );

  const resolveParentSlug = (category: Category): string | null => {
    if (!category.parent) return null;

    if (typeof category.parent !== "string") {
      return category.parent.slug || null;
    }

    const parentCategory = categoriesById.get(category.parent);
    return parentCategory?.slug || null;
  };

  // Use homepageCategories for top-level nav if provided, otherwise fallback to sorted defaults
  const sortedParents = (homepageCategories && homepageCategories.length > 0) 
    ? homepageCategories 
    : parentCategories
        .sort((a, b) => {
          const orderA = categoryOrder[a.title] ?? 999;
          const orderB = categoryOrder[b.title] ?? 999;
          if (orderA !== 999 && orderB !== 999) return orderA - orderB;
          if (orderA !== 999) return -1;
          if (orderB !== 999) return 1;
          return 0;
        });

  const getSubcategories = (parentId: string) => {
    return subCategories.filter(sub => {
      const pId = typeof sub.parent === 'string' ? sub.parent : sub.parent?.id;
      return pId === parentId;
    });
  };

  useEffect(() => {
    setIsMounted(true);

    // Only restore a theme the user explicitly saved — default is always light
    const savedTheme = localStorage.getItem("payload-theme") as "light" | "dark" | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // No saved preference → always start in light mode
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    let resizeTimer: NodeJS.Timeout;
    
    const updateVisibleItems = () => {
      if (!navContainerRef.current) return;

      // If mobile, show all
      if (window.innerWidth <= 900) {
        setVisibleCount(sortedParents.length);
        return;
      }

      const container = navContainerRef.current;
      // Read clientWidth only once — no writes before this read, so no forced reflow
      const containerWidth = container.parentElement?.clientWidth || container.clientWidth;
      
      // Buffer for "முகப்பு" + Navigation icon + Actions + Padding (approx 195px)
      const availableWidth = containerWidth - 195; 

      // Use canvas.measureText instead of DOM insertion to avoid forced reflow
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = '800 13.5px "Mukta Malar", sans-serif';

      let currentWidth = 0;
      let newVisibleCount = 0;

      for (let i = 0; i < sortedParents.length; i++) {
        const parentRef = sortedParents[i];
        if (!parentRef) continue;

        const hasSub = getSubcategories(parentRef.id).length > 0;
        const textWidth = Math.ceil(ctx.measureText(parentRef.title).width);
        const itemWidth = textWidth + 25 + (hasSub ? 15 : 0);
        
        const isLast = i === sortedParents.length - 1;
        const moreBuffer = isLast ? 0 : 45;
        
        if (currentWidth + itemWidth + moreBuffer > availableWidth) {
          break;
        }
        
        currentWidth += itemWidth;
        newVisibleCount++;
      }
      
      setVisibleCount(newVisibleCount);
    };

    // Defer execution of layout measurements to let initial paint (FCP/LCP) run first
    const initialTimer = setTimeout(updateVisibleItems, 100);

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateVisibleItems, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [categories, homepageCategories]);

  const visibleParents = sortedParents.slice(0, visibleCount);
  const hiddenParents = sortedParents.slice(visibleCount);

  const getSelectedKey = () => {
    if (pathname === "/") return "home";
    const segments = pathname.split("/").filter(Boolean);
    for (const category of categories) {
      const parentSlug = resolveParentSlug(category);
      const categoryPath = parentSlug
        ? `/${parentSlug}/${category.slug}`
        : `/${category.slug}`;

      if (pathname === categoryPath) return category.id;

      if (segments.length === 2 || segments.length === 3) {
        const urlCategorySlug = segments[0];
        const urlSubCategorySlug = segments.length === 3 ? segments[1] : null;

        const matchesCategory = parentSlug
          ? urlCategorySlug === parentSlug &&
            urlSubCategorySlug === category.slug
          : urlCategorySlug === category.slug;

        if (matchesCategory) return category.id;
      }
    }
    return "";
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const nextIsScrolled = scrollPosition > 64;
      setIsScrolled((prev) => (prev === nextIsScrolled ? prev : nextIsScrolled));

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction =
        maxScroll > 0 ? Math.min(scrollPosition / maxScroll, 1) : 0;

      // Width logic moved to separate effect
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const handleSubmenuEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const li = e.currentTarget;
    const submenu = li.querySelector('.dropdown-submenu-dynamic') as HTMLElement;
    if (submenu) {
      const rect = li.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      
      if (rect.right + 200 > windowWidth) {
        submenu.style.left = 'auto';
        submenu.style.right = '100%';
        submenu.style.transform = 'translateX(-5px)';
      } else {
        submenu.style.right = 'auto';
        submenu.style.left = '100%';
        submenu.style.transform = 'translateX(5px)';
      }
    }
  };

  const selectedKey = getSelectedKey();

  // Update underline width based on active word size
  useEffect(() => {
    const updateUnderline = () => {
      const activeLink = document.querySelector(".nav-wrapper li.active a");
      if (activeLink) {
        setUnderlineWidth(activeLink.getBoundingClientRect().width);
      } else {
        // Fallback for "home" if selector fails
        if (selectedKey === "home") {
          const homeLink = document.querySelector('.home-icon-container li.active a');
          if (homeLink) setUnderlineWidth(homeLink.getBoundingClientRect().width);
        }
      }
    };

    // Small timeout to ensure DOM is ready after category list transition
    const timer = setTimeout(updateUnderline, 100);
    return () => clearTimeout(timer);
  }, [pathname, visibleCount, isMounted, selectedKey]);

  const getCategoryHref = (c: Category) => {
    const parentSlug = resolveParentSlug(c);
    return parentSlug ? `/${parentSlug}/${c.slug}` : `/${c.slug}`;
  };

  return (
    <>
      <header className="site-main">
        <div className="main-header">
          <div className="site">
            <div className="header-one" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <Link href="/" className="logo-link">
                <Image
                  src="/dinasuvadu.svg"
                  alt="Dinasuvadu Logo"
                  width={180}
                  height={40}
                  className="logo"
                />
              </Link>

              <div className="header-right-actions" style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "15px" }}>
                <Link
                  href="/latest-feed"
                  className="feed-btn"
                  title="Latest Feed"
                  style={{
                    background: "#0066ff",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "900",
                    gap: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 2px 4px rgba(0, 102, 255, 0.2)",
                    textDecoration: "none"
                  }}
                >
                  <span style={{ width: "8px", height: "8px", background: "white", borderRadius: "50%", display: "inline-block" }} className="animate-pulse" />
                  FEED
                </Link>

                <button
                  className="theme-toggle-btn"
                  type="button"
                  onClick={toggleTheme}
                  title={theme === "light" ? "Dark Mode" : "Light Mode"}
                  aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "inherit",
                  }}
                >
                  {theme === "light" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  )}
                </button>

                <button
                  className="search-btn-top"
                  type="button"
                  onClick={toggleSearch}
                  title="Search"
                  aria-label="Search"
                  style={{ padding: 0, margin: 0, background: "none", border: "none", cursor: "pointer", color: "inherit" }}
                >
                  <svg
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </button>

                <button 
                  className="menu-btn" 
                  type="button"
                  aria-label="Open navigation menu"
                  onClick={() => setDrawerVisible(true)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "inherit", padding: "8px" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <nav className="header-two">
            <div className="site">
              <div className="nav-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", width: "100%", padding: 0, overflow: "visible" }}>
                <div className="home-icon-container" style={{ display: "flex", alignItems: "center", flexShrink: 0, zIndex: 20, padding: "0 15px 0 12px" }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", alignItems: "center" }}>
                    <li className={selectedKey === "home" ? "active" : ""} style={{ display: "flex", alignItems: "center", listStyle: "none" }}>
                      <Link 
                        href="/" 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          fontWeight: "800",
                          fontFamily: "'Mukta Malar', sans-serif",
                          fontSize: "13.5px",
                          letterSpacing: "-0.2px",
                          textDecoration: "none",
                          color: "inherit"
                        }}
                      >
                        முகப்பு
                      </Link>
                      {selectedKey === "home" && (
                        <span
                          className="underline-bar"
                          style={{ width: `${underlineWidth}px` }}
                        />
                      )}
                    </li>
                  </ul>
                </div>

              <ul className="drawer-menu" ref={navContainerRef} style={{ padding: 0, flex: 1, display: "flex", alignItems: "center", margin: 0 }}>

                {(isMounted ? visibleParents : sortedParents).map((parent) => {
                  const children = getSubcategories(parent.id);
                  const hasChildren = children.length > 0;
                  
                  return (
                    <li
                      key={parent.id}
                      className={`${selectedKey === parent.id ? "active" : ""} ${hasChildren ? "has-dropdown" : ""}`}
                    >
                      <Link 
                        href={getCategoryHref(parent)}
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "0",
                          fontWeight: "800",
                          fontFamily: "'Mukta Malar', sans-serif",
                          fontSize: "13.5px",
                          letterSpacing: "-0.2px",
                          textDecoration: "none",
                          color: "inherit"
                        }}
                      >
                        {parent.title}
                        {hasChildren && (
                          <ChevronIcon
                            size={14}
                            className="dropdown-chevron"
                            style={{ marginLeft: "-2px", opacity: 0.7 }}
                          />
                        )}
                      </Link>
                      {hasChildren && (
                        <ul className="dropdown-menu">
                          {children.map(child => (
                            <li key={child.id} className={selectedKey === child.id ? "active" : ""}>
                              <Link href={getCategoryHref(child)}>{child.title}</Link>
                            </li>
                          ))}
                        </ul>
                      )}
                      {selectedKey === parent.id && (
                        <span
                          className="underline-bar"
                          style={{ width: `${underlineWidth}px` }}
                        />
                      )}
                    </li>
                  );
                })}

                {isMounted && hiddenParents.length > 0 && (
                  <li className="has-dropdown more-item">
                    <Link href="#" onClick={(e) => e.preventDefault()}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </Link>
                    <ul className="dropdown-menu">
                      {hiddenParents.map((parent) => (
                        <li key={parent.id} className="has-dropdown-submenu" onMouseEnter={handleSubmenuEnter}>
                          <Link 
                            href={getCategoryHref(parent)}
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "0",
                                fontWeight: "800",
                                fontFamily: "'Mukta Malar', sans-serif",
                                fontSize: "14px",
                                letterSpacing: "-0.2px"
                            }}
                          >
                            {parent.title}
                            {getSubcategories(parent.id).length > 0 && (
                              <ChevronIcon
                                size={14}
                                style={{ marginLeft: "auto", opacity: 0.6 }}
                              />
                            )}
                          </Link>
                          {getSubcategories(parent.id).length > 0 && (
                            <ul className="dropdown-submenu-dynamic">
                              {getSubcategories(parent.id).map(child => (
                                <li key={child.id} className={selectedKey === child.id ? "active" : ""}>
                                  <Link href={getCategoryHref(child)}>{child.title}</Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
              </div>
            </div>
          </nav>

          <div className={`search-bar ${searchVisible ? "visible" : "hidden"}`}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch} title="Search">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer with Backdrop */}
      <>
        {/* Backdrop */}
        <div
          className={`drawer-backdrop ${drawerVisible ? "open" : ""}`}
          onClick={() => setDrawerVisible(false)}
        />

        {/* Drawer */}
        <div className={`mobile-drawer ${drawerVisible ? "open" : ""}`}>
          <div className="drawer-header">
            <Image src="/dinasuvadu.svg" alt="Dinasuvadu Logo" width={140} height={32} style={{ height: "30px", width: "auto" }} />
            <button className="close-btn-fixed" onClick={() => setDrawerVisible(false)}>
              ✕
            </button>
          </div>

          <div className="drawer-search" style={{ marginBottom: "20px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search Dinasuvadu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <svg 
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <ul className="drawer-accordion" style={{ listStyle: "none", padding: 0 }}>
            {categories.filter(c => !c.parent).map((parent) => {
              const children = getSubcategories(parent.id);
              const isExpanded = expandedId === parent.id;
              
              return (
                <li key={parent.id} className="accordion-item">
                  <div 
                    className="accordion-trigger"
                    onClick={children.length > 0 ? () => setExpandedId(isExpanded ? null : parent.id) : undefined}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0", flex: 1 }}>
                      {children.length > 0 ? (
                        <span
                          className={`drawer-parent-link ${selectedKey === parent.id ? "active" : ""}`}
                          style={{
                            fontWeight: "800",
                            fontSize: "14px",
                            fontFamily: "'Mukta Malar', sans-serif",
                            letterSpacing: "-0.2px",
                            display: "inline-block",
                            lineHeight: "1",
                            color: "inherit",
                          }}
                        >
                          {parent.title}
                        </span>
                      ) : (
                        <Link 
                          href={getCategoryHref(parent)}
                          className={`drawer-parent-link ${selectedKey === parent.id ? "active" : ""}`}
                          onClick={() => setDrawerVisible(false)}
                          style={{ 
                            fontWeight: "800", 
                            textDecoration: "none", 
                            fontSize: "14px", 
                            fontFamily: "'Mukta Malar', sans-serif",
                            letterSpacing: "-0.2px",
                            display: "inline-block",
                            lineHeight: "1"
                          }}
                        >
                          {parent.title}
                        </Link>
                      )}
                    </div>
                    {children.length > 0 && (
                      <ChevronIcon
                        size={18}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.3s",
                          color: "#666",
                        }}
                      />
                    )}
                  </div>
                  {children.length > 0 && (
                    <div
                      id={`drawer-children-${parent.id}`}
                      className={`accordion-content ${isExpanded ? "open" : ""}`}
                      style={{ overflow: "hidden", maxHeight: isExpanded ? "500px" : "0", transition: "max-height 0.3s ease-out" }}
                    >
                      <ul style={{ listStyle: "none", padding: "5px 0 15px 0", textAlign: "left" }}>
                        {children.map(child => (
                          <li key={child.id} style={{ padding: "8px 0", textAlign: "left" }}>
                             <Link 
                               href={getCategoryHref(child)} 
                               onClick={() => setDrawerVisible(false)}
                               className={`drawer-child-link ${selectedKey === child.id ? "active" : ""}`}
                               style={{ textDecoration: "none", fontSize: "13.5px", fontWeight: "600", display: "block", textAlign: "left" }}
                             >
                              {child.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="drawer-footer" style={{ marginTop: "auto", paddingTop: "20px" }}>
            <a href="#" style={{ color: "#0066cc", fontWeight: "bold", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
              Subscribe
            </a>
          </div>
        </div>
      </>
    </>
  );
}
