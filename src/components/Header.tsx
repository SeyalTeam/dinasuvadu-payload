"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Newspaper, 
  BookOpen, 
  Globe, 
  Clapperboard, 
  Trophy, 
  Cpu, 
  CircleDollarSign, 
  Target,
  Flower2,
  Speech,
  GraduationCap,
  CarFront,
  Activity,
  BriefcaseBusiness,
  Flag,
  Map,
  CloudSun,
  Zap,
  ShieldAlert,
  Hourglass,
  Flame,
  Coffee,
  ChevronDown,
  LayoutGrid
} from "lucide-react";

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
        })
        .slice(0, 10);

  const getSubcategories = (parentId: string) => {
    return subCategories.filter(sub => {
      const pId = typeof sub.parent === 'string' ? sub.parent : sub.parent?.id;
      return pId === parentId;
    });
  };

  useLayoutEffect(() => {
    setIsMounted(true);
    const updateVisibleItems = () => {
      if (!navContainerRef.current) return;

      // If mobile, show all
      if (window.innerWidth <= 900) {
        setVisibleCount(sortedParents.length);
        return;
      }

      const container = navContainerRef.current;
      const containerWidth = container.parentElement?.clientWidth || container.clientWidth;
      
      // Fixed Home icon + Search icon + margin buffer (approx 90px)
      const availableWidth = containerWidth - 90; 

      let currentWidth = 0;
      let newVisibleCount = 0;

      for (let i = 0; i < sortedParents.length; i++) {
        const parentRef = sortedParents[i];
        if (!parentRef) continue;

        const testDiv = document.createElement('div');
        testDiv.style.visibility = 'hidden';
        testDiv.style.position = 'absolute';
        testDiv.style.whiteSpace = 'nowrap';
        // USE WEIGHT 900 to match the UI
        testDiv.style.font = '800 13.5px "Mukta Malar", sans-serif'; 
        testDiv.innerText = parentRef.title;
        document.body.appendChild(testDiv);
        
        // icon (22px) + gap (5px) + padding (10px) + margin = 45px base
        // plus chevron (14px) if applicable
        const hasSub = getSubcategories(parentRef.id).length > 0;
        const itemWidth = testDiv.offsetWidth + 45 + (hasSub ? 15 : 0); 
        document.body.removeChild(testDiv);
        
        const isLast = i === sortedParents.length - 1;
        // Buffer for the "More" icon + container padding
        const moreBuffer = isLast ? 0 : 85;
        
        if (currentWidth + itemWidth + moreBuffer > availableWidth) {
           break;
        }
        
        currentWidth += itemWidth;
        newVisibleCount++;
      }
      
      setVisibleCount(newVisibleCount);
    };

    updateVisibleItems();
    window.addEventListener("resize", updateVisibleItems);
    return () => window.removeEventListener("resize", updateVisibleItems);
  }, [categories, homepageCategories]);

  const visibleParents = sortedParents.slice(0, visibleCount);
  const hiddenParents = sortedParents.slice(visibleCount);

  const getSelectedKey = () => {
    if (pathname === "/") return "home";
    const segments = pathname.split("/").filter(Boolean);
    for (const category of categories) {
      const parentSlug =
        category.parent && typeof category.parent !== "string"
          ? category.parent.slug || "uncategorized"
          : null;
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
      setIsScrolled(scrollPosition > 64);

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction =
        maxScroll > 0 ? Math.min(scrollPosition / maxScroll, 1) : 0;

      const activeItem = document.querySelector(".drawer-menu li.active");
      if (activeItem) {
        const activeItemWidth = activeItem.getBoundingClientRect().width;
        const newWidth = scrollFraction * activeItemWidth;
        setUnderlineWidth(newWidth);
      }
    };

    window.addEventListener("scroll", handleScroll);
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

  const getCategoryIcon = (title: string) => {
    const t = title.trim();
    let Icon = LayoutGrid;
    const color = "#444"; // Consistent dark gray like Vikatan icons

    if (t.includes("செய்திகள்")) { Icon = Newspaper; }
    else if (t.includes("இதழ்கள்")) { Icon = BookOpen; }
    else if (t.includes("அரசியல்")) { Icon = Speech; }
    else if (t.includes("தமிழ்நாடு")) { Icon = Map; }
    else if (t.includes("இந்தியா")) { Icon = Flag; }
    else if (t.includes("உலகம்")) { Icon = Globe; }
    else if (t.includes("சினிமா")) { Icon = Clapperboard; }
    else if (t.includes("விளையாட்டு")) { Icon = Trophy; }
    else if (t.includes("பணம்") || t.includes("வணிகம்")) { Icon = CircleDollarSign; }
    else if (t.includes("ஆன்மீகம்")) { Icon = Flower2; }
    else if (t.includes("தேர்தல்")) { Icon = Target; }
    else if (t.includes("தொழில்நுட்பம்")) { Icon = Cpu; }
    else if (t.includes("கல்வி")) { Icon = GraduationCap; }
    else if (t.includes("ஆரோக்கியம்")) { Icon = Activity; }
    else if (t.includes("வேலைவாய்ப்பு")) { Icon = BriefcaseBusiness; }
    else if (t.includes("கார்") || t.includes("பைக்") || t.includes("வாகனங்கள்") || t.toLowerCase().includes("automobile") || t.includes("ஆட்டோமொபைல்")) { Icon = CarFront; }
    else if (t.includes("வானிலை")) { Icon = CloudSun; }
    else if (t.includes("வாழ்க்கை") || t.includes("லைஃப்ஸ்டைல்")) { Icon = Coffee; }
    else if (t.includes("வைரல்")) { Icon = Zap; }
    else if (t.includes("குற்றம்")) { Icon = ShieldAlert; }
    else if (t.includes("வரலாறு")) { Icon = Hourglass; }
    else if (t.includes("முக்கிய") || t.includes("டாப்-நியூஸ்")) { Icon = Flame; }

    return <Icon size={18} style={{ color }} strokeWidth={2.5} />;
  };

  const getCategoryHref = (c: Category) => {
    const parentSlug = c.parent && typeof c.parent !== 'string' ? c.parent.slug : null;
    return parentSlug ? `/${parentSlug}/${c.slug}` : `/${c.slug}`;
  };

  return (
    <>
      <header className="site site-main">
        <div className="main-header">
          <div className={`header-one ${isScrolled ? "hidden" : ""}`}>
            <button className="menu-btn" onClick={() => setDrawerVisible(true)}>
              ☰
            </button>
            <Link href="/" className="logo-link">
              <img
                src="/dinasuvadu.svg"
                alt="Dinasuvadu Logo"
                className="logo"
              />
            </Link>
            <button
              className="search-btn-top"
              onClick={toggleSearch}
              title="Search"
              style={{ padding: 0, margin: 0, background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <svg
                width="24"
                height="24"
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

          <nav className={`header-two ${isScrolled ? "sticky" : ""}`}>
            <div className="nav-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", width: "100%", padding: 0, overflow: "visible" }}>
                <div className="home-icon-container" style={{ display: "flex", alignItems: "center", flexShrink: 0, zIndex: 20, background: "white", padding: "0 15px 0 0" }}>
                  <li className={selectedKey === "home" ? "active" : ""} style={{ display: "flex", alignItems: "center", listStyle: "none" }}>
                    <Link href="/" aria-label="Home" style={{ display: "flex", alignItems: "center", padding: "0 5px" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                      </svg>
                    </Link>
                    {selectedKey === "home" && (
                      <span
                        className="underline-bar"
                        style={{ width: `${underlineWidth}px` }}
                      />
                    )}
                  </li>
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
                          gap: "5px",
                          fontWeight: "800",
                          fontFamily: "'Mukta Malar', sans-serif",
                          fontSize: "13.5px",
                          letterSpacing: "-0.2px",
                          textDecoration: "none",
                          color: "inherit"
                        }}
                      >
                        {getCategoryIcon(parent.title)}
                        {parent.title}
                        {hasChildren && <ChevronDown size={14} className="dropdown-chevron" style={{ marginLeft: "-2px", opacity: 0.7 }} />}
                      </Link>
                      {hasChildren && (
                        <ul className="dropdown-menu">
                          {children.map(child => (
                            <li key={child.id}>
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
                                gap: "8px",
                                fontWeight: "800",
                                fontFamily: "'Mukta Malar', sans-serif",
                                fontSize: "14px",
                                letterSpacing: "-0.2px"
                            }}
                          >
                            {getCategoryIcon(parent.title)}
                            {parent.title}
                            {getSubcategories(parent.id).length > 0 && <ChevronDown size={14} style={{ marginLeft: "auto", opacity: 0.6 }} />}
                          </Link>
                          {getSubcategories(parent.id).length > 0 && (
                            <ul className="dropdown-submenu-dynamic">
                              {getSubcategories(parent.id).map(child => (
                                <li key={child.id}>
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
          <div className="drawer-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <img src="/dinasuvadu.svg" alt="Logo" style={{ height: "30px" }} />
            <button className="close-btn-fixed" onClick={() => setDrawerVisible(false)} style={{ background: "black", color: "white", borderRadius: "50%", width: "30px", height: "30px", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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
                style={{ width: "100%", padding: "10px 40px 10px 10px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
              <svg 
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#666" }}
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
                    onClick={() => children.length > 0 && setExpandedId(isExpanded ? null : parent.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px dashed #eee", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                      {getCategoryIcon(parent.title)}
                      <Link 
                        href={children.length > 0 ? "#" : getCategoryHref(parent)}
                        onClick={(e) => {
                          if (children.length > 0) e.preventDefault();
                          else setDrawerVisible(false);
                        }}
                        style={{ 
                          fontWeight: "800", 
                          color: "#333", 
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
                    </div>
                    {children.length > 0 && (
                      <ChevronDown 
                        size={18}
                        style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.3s", color: "#666" }}
                      />
                    )}
                  </div>
                  {children.length > 0 && (
                    <div className={`accordion-content ${isExpanded ? "open" : ""}`} style={{ overflow: "hidden", maxHeight: isExpanded ? "500px" : "0", transition: "max-height 0.3s ease-out" }}>
                      <ul style={{ listStyle: "none", padding: "5px 0 15px 0", textAlign: "left" }}>
                        {children.map(child => (
                          <li key={child.id} style={{ padding: "8px 0", textAlign: "left" }}>
                            <Link 
                              href={getCategoryHref(child)} 
                              onClick={() => setDrawerVisible(false)}
                              style={{ color: "#333", textDecoration: "none", fontSize: "13.5px", fontWeight: "600", display: "block", textAlign: "left" }}
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
