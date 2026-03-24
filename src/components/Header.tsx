"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type HeaderProps = {
  categories: Category[];
};

export default function Header({ categories }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [underlineWidth, setUnderlineWidth] = useState(0);

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) setSearchQuery("");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery)}`);
      setSearchVisible(false);
    }
  };

  const categoryOrder: { [key: string]: number } = {
    தமிழ்நாடு: 0,
    இந்தியா: 1,
    உலகம்: 2,
  };

  // Organize categories into parents and children
  const parentCategories = categories.filter(c => !c.parent);
  const subCategories = categories.filter(c => c.parent);

  const sortedParents = parentCategories
    .sort((a, b) => {
      const orderA = categoryOrder[a.title] ?? 999;
      const orderB = categoryOrder[b.title] ?? 999;
      if (orderA !== 999 && orderB !== 999) return orderA - orderB;
      if (orderA !== 999) return -1;
      if (orderB !== 999) return 1;
      // return categories.indexOf(b) - categories.indexOf(a);
      return 0;
    })
    .slice(0, 10);

  const getSubcategories = (parentId: string) => {
    return subCategories.filter(sub => {
      const pId = typeof sub.parent === 'string' ? sub.parent : sub.parent?.id;
      return pId === parentId;
    });
  };

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
      console.log(
        "Scroll Position:",
        scrollPosition,
        "isScrolled:",
        scrollPosition > 64
      );
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
    handleScroll(); // Initial check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const selectedKey = getSelectedKey();

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
              className="search-btn"
              onClick={toggleSearch}
              title="Search"
            >
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

          <nav className={`header-two ${isScrolled ? "sticky" : ""}`}>
            <ul className="drawer-menu">
              <li className={selectedKey === "home" ? "active" : ""}>
                <Link href="/">Home</Link>
                {selectedKey === "home" && (
                  <span
                    className="underline-bar"
                    style={{ width: `${underlineWidth}px` }}
                  />
                )}
              </li>

              {sortedParents.map((parent) => {
                const children = getSubcategories(parent.id);
                const hasChildren = children.length > 0;
                
                return (
                  <li
                    key={parent.id}
                    className={`${selectedKey === parent.id ? "active" : ""} ${hasChildren ? "has-dropdown" : ""}`}
                  >
                    <Link href={`/${parent.slug}`}>{parent.title}</Link>
                    {hasChildren && (
                      <ul className="dropdown-menu">
                        {children.map(child => (
                          <li key={child.id}>
                            <Link href={`/${parent.slug}/${child.slug}`}>{child.title}</Link>
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
            </ul>
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
        {drawerVisible && (
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerVisible(false)}
          />
        )}

        {/* Drawer */}
        <div className={`mobile-drawer ${drawerVisible ? "open" : ""}`}>
          <button className="close-btn" onClick={() => setDrawerVisible(false)}>
            ✕
          </button>

          <ul className="drawer-menu-vertical">
            <li onClick={() => setDrawerVisible(false)}>
              <Link href="/" className="logo-link">
                <img
                  src="/dinasuvadu.svg"
                  alt="Dinasuvadu Logo"
                  className="mob-logo"
                />
              </Link>
            </li>
            {sortedParents.map((parent) => {
              const children = getSubcategories(parent.id);
              const hasChildren = children.length > 0;
              
              return (
                <li key={parent.id}>
                  <Link href={`/${parent.slug}`} onClick={() => setDrawerVisible(false)}>{parent.title}</Link>
                  {hasChildren && (
                    <ul className="drawer-submenu">
                      {children.map(child => (
                        <li key={child.id} onClick={() => setDrawerVisible(false)}>
                          <Link href={`/${parent.slug}/${child.slug}`}>{child.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li>
              <a href="#"></a>
              <section className="fllw-btn">
                <a href="#"> </a>
                <div>
                  <a href="#"></a>
                  <div className="d-flex fl-dir gap">
                    <a href="#">
                      <div className="border-top"></div>
                    </a>
                    <div className="d-flex gap al-cn social-med-icons">
                      <a
                        href="https://whatsapp.com/channel/0029Va4U8pVKLaHkkCs8Xx0L"
                        aria-label="Menu"
                      >
                        <span className="whatsapp">
                          <svg
                            fill="#38AE41"
                            height="20px"
                            width="20px"
                            version="1.1"
                            id="Layer_1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 308 308"
                          >
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g
                              id="SVGRepo_tracerCarrier"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            ></g>
                            <g id="SVGRepo_iconCarrier">
                              <g id="XMLID_468_">
                                <path
                                  id="XMLID_469_"
                                  d="M227.904,176.981c-0.6-0.288-23.054-11.345-27.044-12.781c-1.629-0.585-3.374-1.156-5.23-1.156 c-3.032,0-5.579,1.511-7.563,4.479c-2.243,3.334-9.033,11.271-11.131,13.642c-0.274,0.313-0.648,0.687-0.872,0.687 c-0.201,0-3.676-1.431-4.728-1.888c-24.087-10.463-42.37-35.624-44.877-39.867c-0.358-0.61-0.373-0.887-0.376-0.887 c0.088-0.323,0.898-1.135,1.316-1.554c1.223-1.21,2.548-2.805,3.83-4.348c0.607-0.731,1.215-1.463,1.812-2.153 c1.86-2.164,2.688-3.844,3.648-5.79l0.503-1.011c2.344-4.657,0.342-8.587-0.305-9.856c-0.531-1.062-10.012-23.944-11.02-26.348 c-2.424-5.801-5.627-8.502-10.078-8.502c-0.413,0,0,0-1.732,0.073c-2.109,0.089-13.594,1.601-18.672,4.802 c-5.385,3.395-14.495,14.217-14.495,33.249c0,17.129,10.87,33.302,15.537,39.453c0.116,0.155,0.329,0.47,0.638,0.922 c17.873,26.102,40.154,45.446,62.741,54.469c21.745,8.686,32.042,9.69,37.896,9.69c0.001,0,0.001,0,0.001,0 c2.46,0,4.429-0.193,6.166-0.364l1.102-0.105c7.512-0.666,24.02-9.22,27.775-19.655c2.958-8.219,3.738-17.199,1.77-20.458 C233.168,179.508,230.845,178.393,227.904,176.981z"
                                ></path>
                                <path
                                  id="XMLID_470_"
                                  d="M156.734,0C73.318,0,5.454,67.354,5.454,150.143c0,26.777,7.166,52.988,20.741,75.928L0.212,302.716 c-0.484,1.429-0.124,3.009,0.933,4.085C1.908,307.58,2.943,308,4,308c0.405,0,0.813-0.061,1.211-0.188l79.92-25.396 c21.87,11.685,46.588,17.853,71.604,17.853C240.143,300.27,308,232.923,308,150.143C308,67.354,240.143,0,156.734,0z M156.734,268.994c-23.539,0-46.338-6.797-65.936-19.657c-0.659-0.433-1.424-0.655-2.194-0.655c-0.407,0-0.815,0.062-1.212,0.188 l-40.035,12.726l12.924-38.129c0.418-1.234,0.209-2.595-0.561-3.647c-14.924-20.392-22.813-44.485-22.813-69.677 c0-65.543,53.754-118.867,119.826-118.867c66.064,0,119.812,53.324,119.812,118.867 C276.546,215.678,222.799,268.994,156.734,268.994z"
                                ></path>
                              </g>
                            </g>
                          </svg>
                        </span>
                      </a>
                      <a href="https://m.facebook.com/dinasuvaduta?wtsid=rdr_0nhAQjg4CKxUhSz4b">
                        <span className="fb">
                          <svg
                            width="10"
                            height="15"
                            viewBox="0 0 10 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M6.59998 3.30001H8.09998C8.26558 3.30001 8.39998 3.16561 8.39998 3.00001V0.978906C8.39998 0.821706 8.27908 0.690906 8.12248 0.679806C7.64518 0.645906 6.71278 0.600006 6.04228 0.600006C4.19998 0.600006 2.99998 1.70401 2.99998 3.71041V5.70001H0.899976C0.734376 5.70001 0.599976 5.83441 0.599976 6.00001V8.10001C0.599976 8.26561 0.734376 8.40001 0.899976 8.40001H2.99998V14.1C2.99998 14.2656 3.13438 14.4 3.29998 14.4H5.39998C5.56558 14.4 5.69998 14.2656 5.69998 14.1V8.40001H7.86658C8.01958 8.40001 8.14798 8.28511 8.16478 8.13301L8.39818 6.03301C8.41798 5.85541 8.27878 5.70001 8.09998 5.70001H5.69998V4.20001C5.69998 3.70291 6.10288 3.30001 6.59998 3.30001Z"
                              fill="#4267B2"
                            />
                          </svg>
                        </span>
                      </a>
                      <a href="https://www.instagram.com/dinasuvadunews/">
                        <span className="insta">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <g clipPath="url(#clip0_4587_17)">
                              <path
                                d="M11 0H5C3.67392 0 2.40215 0.526784 1.46447 1.46447C0.526784 2.40215 0 3.67392 0 5L0 11C0 12.3261 0.526784 13.5979 1.46447 14.5355C2.40215 15.4732 3.67392 16 5 16H11C12.3261 16 13.5979 15.4732 14.5355 14.5355C15.4732 13.5979 16 12.3261 16 11V5C16 3.67392 15.4732 2.40215 14.5355 1.46447C13.5979 0.526784 12.3261 0 11 0ZM14.5 11C14.5 12.93 12.93 14.5 11 14.5H5C3.07 14.5 1.5 12.93 1.5 11V5C1.5 3.07 3.07 1.5 5 1.5H11C12.93 1.5 14.5 3.07 14.5 5V11Z"
                                fill="url(#paint0_linear_4587_17)"
                              />
                              <path
                                d="M8 4C6.93913 4 5.92172 4.42143 5.17157 5.17157C4.42143 5.92172 4 6.93913 4 8C4 9.06087 4.42143 10.0783 5.17157 10.8284C5.92172 11.5786 6.93913 12 8 12C9.06087 12 10.0783 11.5786 10.8284 10.8284C11.5786 10.0783 12 9.06087 12 8C12 6.93913 11.5786 5.92172 10.8284 5.17157C10.0783 4.42143 9.06087 4 8 4ZM8 10.5C7.3372 10.4992 6.70178 10.2356 6.23311 9.76689C5.76444 9.29822 5.50079 8.6628 5.5 8C5.5 6.621 6.622 5.5 8 5.5C9.378 5.5 10.5 6.621 10.5 8C10.5 9.378 9.378 10.5 8 10.5Z"
                                fill="url(#paint1_linear_4587_17)"
                              />
                              <path
                                d="M12.3 4.23301C12.5943 4.23301 12.833 3.99438 12.833 3.70001C12.833 3.40564 12.5943 3.16701 12.3 3.16701C12.0056 3.16701 11.767 3.40564 11.767 3.70001C11.767 3.99438 12.0056 4.23301 12.3 4.23301Z"
                                fill="url(#paint2_linear_4587_17)"
                              />
                            </g>
                            <defs>
                              <linearGradient
                                id="paint0_linear_4587_17"
                                x1="1.464"
                                y1="14.536"
                                x2="14.536"
                                y2="1.464"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#FFC107" />
                                <stop offset="0.507" stopColor="#F44336" />
                                <stop offset="0.99" stopColor="#9C27B0" />
                              </linearGradient>
                              <linearGradient
                                id="paint1_linear_4587_17"
                                x1="5.172"
                                y1="10.828"
                                x2="10.828"
                                y2="5.172"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#FFC107" />
                                <stop offset="0.507" stopColor="#F44336" />
                                <stop offset="0.99" stopColor="#9C27B0" />
                              </linearGradient>
                              <linearGradient
                                id="paint2_linear_4587_17"
                                x1="11.923"
                                y1="4.07701"
                                x2="12.677"
                                y2="3.32301"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#FFC107" />
                                <stop offset="0.507" stopColor="#F44336" />
                                <stop offset="0.99" stopColor="#9C27B0" />
                              </linearGradient>
                              <clipPath id="clip0_4587_17">
                                <rect width="16" height="16" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                      </a>
                      <a href="https://x.com/Dinasuvadu">
                        <span className="twit">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_4587_21)">
                              <path
                                d="M15.58 15.3333L9.71667 6.78534L9.72667 6.79334L15.0133 0.666672H13.2467L8.94 5.65334L5.52 0.666672H0.88667L6.36067 8.64734L6.36 8.64667L0.58667 15.3333H2.35334L7.14134 9.78534L10.9467 15.3333H15.58ZM4.82 2.00001L13.0467 14H11.6467L3.41334 2.00001H4.82Z"
                                fill="black"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_4587_21">
                                <rect width="16" height="16" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                      </a>
                      <a
                        href="https://www.youtube.com/@dinasuvadumedia"
                        target="_blank"
                        aria-label="Menu"
                        rel="noopener"
                      >
                        <span className="y-tube">
                          <svg
                            width="15"
                            height="11"
                            viewBox="0 0 15 11"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_4590_43)">
                              <path
                                d="M14.3 9.00625C14.1583 9.75 13.5562 10.3167 12.8125 10.4229C11.6437 10.6 9.69579 10.8125 7.49996 10.8125C5.33954 10.8125 3.39163 10.6 2.18746 10.4229C1.44371 10.3167 0.841626 9.75 0.699959 9.00625C0.558293 8.19167 0.416626 6.9875 0.416626 5.5C0.416626 4.0125 0.558293 2.80833 0.699959 1.99375C0.841626 1.25 1.44371 0.683333 2.18746 0.577083C3.35621 0.4 5.30413 0.1875 7.49996 0.1875C9.69579 0.1875 11.6083 0.4 12.8125 0.577083C13.5562 0.683333 14.1583 1.25 14.3 1.99375C14.4416 2.80833 14.6187 4.0125 14.6187 5.5C14.5833 6.9875 14.4416 8.19167 14.3 9.00625Z"
                                fill="#FF3D00"
                              />
                              <path
                                d="M6.08337 7.97916V3.02083L10.3334 5.49999L6.08337 7.97916Z"
                                fill="white"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_4590_43">
                                <rect width="15" height="11" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </li>
          </ul>
        </div>
      </>
    </>
  );
}
