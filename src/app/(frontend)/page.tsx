export const revalidate = 10; // Revalidate every 60 seconds
import axios from "axios";
import Link from "next/link";
import { Row, Col, Card, Space } from "antd";
// import { ClockCircleOutlined } from '@ant-design/icons';
import Text from "antd/es/typography/Text";

// Type definitions
type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  author?: string;
  categories?: Category[];
  heroImage?: {
    url: string;
    alt?: string;
  };
  layout?: {
    blockType: string;
    media?: {
      url: string;
      alt?: string;
    };
  }[];
  meta?: {
    description?: string;
  };
  tags?: { id: string; title: string; slug: string }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Fetch categories
async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories?depth=2`);
    const categories = res.data.docs || [];
    console.log("Fetched categories:", categories);
    return categories;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as any).response === "object"
    ) {
      console.error(
        "Error fetching categories:",
        (err as any).response?.data || (err as any).message
      );
    } else {
      console.error("Error fetching categories:", (err as any)?.message || err);
    }
    return [];
  }
}

// Fetch latest posts
async function fetchLatestPosts(): Promise<Post[]> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/posts?limit=34&depth=2&sort=-publishedAt`
    );
    const posts = res.data.docs || [];
    console.log("Fetched latest posts:", JSON.stringify(posts, null, 2));
    return posts;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as any).response === "object"
    ) {
      console.error(
        "Error fetching latest posts:",
        (err as any).response?.data || (err as any).message
      );
    } else {
      console.error(
        "Error fetching latest posts:",
        (err as any)?.message || err
      );
    }
    return [];
  }
}

// Fetch posts by category
async function fetchPostsByCategory(categoryId: string): Promise<Post[]> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/posts?limit=7&depth=2&where[categories][contains]=${categoryId}`
    );
    console.log(
      `Fetched ${res.data.docs.length} posts for category ID ${categoryId}:`,
      JSON.stringify(res.data.docs, null, 2)
    );
    return res.data.docs || [];
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as any).response === "object"
    ) {
      console.error(
        `Error fetching posts for category ID ${categoryId}:`,
        (err as any).response?.data || (err as any).message
      );
    } else {
      console.error(
        `Error fetching posts for category ID ${categoryId}:`,
        (err as any)?.message || err
      );
    }
    return [];
  }
}

// Fetch parent category details by ID
async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const res = await axios.get(`${apiUrl}/api/categories/${parentId}?depth=1`);
    const parentCategory = res.data || null;
    if (!parentCategory) {
      console.log(`No parent category found for ID: ${parentId}`);
      return null;
    }
    console.log(`Fetched parent category for ID ${parentId}:`, parentCategory);
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as any).response === "object"
    ) {
      console.error(
        `Error fetching parent category with ID ${parentId}:`,
        (err as any).response?.data || (err as any).message
      );
    } else {
      console.error(
        `Error fetching parent category with ID ${parentId}:`,
        (err as any)?.message || err
      );
    }
    return null;
  }
}

// Define the clamping style
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Helper function to get the URL path for a post
async function getPostUrl(post: Post): Promise<string> {
  if (!post.categories || post.categories.length === 0) {
    return `/uncategorized/${post.slug || "fallback-slug"}`;
  }

  const primaryCategory = post.categories[0];
  if (primaryCategory.parent) {
    let parentCategorySlug = "uncategorized";
    const parent =
      typeof primaryCategory.parent === "string"
        ? await fetchParentCategory(primaryCategory.parent)
        : primaryCategory.parent;

    if (parent) {
      parentCategorySlug = parent.slug || "uncategorized";
      return `/${parentCategorySlug}/${primaryCategory.slug}/${
        post.slug || "fallback-slug"
      }`;
    }
  }

  return `/${primaryCategory.slug}/${post.slug || "fallback-slug"}`;
}

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

export default async function Home() {
  const categories = await fetchCategories();
  const latestPosts = await fetchLatestPosts();

  const featuredPost = latestPosts.length > 0 ? latestPosts[0] : null;
  const smallerPosts = latestPosts.length > 1 ? latestPosts.slice(1, 4) : [];
  const additionalPosts =
    latestPosts.length > 4 ? latestPosts.slice(4, 34) : [];

  const categoryOrder: { [key: string]: number } = {
    தமிழ்நாடு: 0,
    இந்தியா: 1,
    உலகம்: 2,
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = categoryOrder[a.title] ?? 999;
    const orderB = categoryOrder[b.title] ?? 999;

    if (orderA !== 999 && orderB !== 999) {
      return orderA - orderB;
    }
    if (orderA !== 999) {
      return -1;
    }
    if (orderB !== 999) {
      return 1;
    }
    return categories.indexOf(b) - categories.indexOf(a);
  });

  console.log(
    "Sorted categories:",
    sortedCategories.map((cat) => cat.title)
  );

  return (
    <div className="site">
      {/* Latest News Section */}
      {(featuredPost || smallerPosts.length > 0) && (
        <section className="content-area">
          <Row style={{ margin: "0" }} className="late-grid">
            {featuredPost && (
              <Col className="feature-img" style={{ padding: "0" }}>
                <Link href={await getPostUrl(featuredPost)}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      border: "none",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    styles={{ body: { padding: 0 } }} // Replace bodyStyle with styles.body
                  >
                    <div style={{ position: "relative" }}>
                      {(() => {
                        const imageUrl = getImageUrl(
                          featuredPost.heroImage?.url
                        );
                        const imageAlt =
                          featuredPost.heroImage?.alt || featuredPost.title;
                        return imageUrl ? (
                          <img
                            alt={imageAlt}
                            src={imageUrl}
                            style={{
                              width: "100%",
                              height: "302px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              position: "relative",
                              zIndex: 1,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "300px",
                              backgroundColor: "#f0f0f0",
                              borderRadius: "8px 8px 0 0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text type="secondary">No Image</Text>
                          </div>
                        );
                      })()}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "100%",
                          background:
                            "linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent)",
                          zIndex: 2,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "16px",
                          left: "16px",
                          right: "16px",
                          color: "#fff",
                          zIndex: 3,
                        }}
                      >
                        <div
                          className="para-txt main-title"
                          style={{
                            ...clampStyle,
                            fontSize: "22px",
                            fontWeight: "600",
                          }}
                        >
                          {featuredPost.title}
                        </div>
                        <div style={{ marginTop: "8px" }}>
                          <Text
                            className="para-txt"
                            style={{ fontSize: "12px", color: "#e6e6e6" }}
                          >
                            {new Date(
                              featuredPost.publishedAt
                            ).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </Col>
            )}

            <Col className="col-01 col-md-3">
              <Row gutter={[16, 8]} style={{ margin: "0", rowGap: "0" }}>
                {await Promise.all(
                  smallerPosts.map(async (post) => {
                    const imageUrl = getImageUrl(post.heroImage?.url);
                    const imageAlt = post.heroImage?.alt || post.title;

                    return (
                      <Col style={{ padding: "0" }} key={post.id}>
                        <Link href={await getPostUrl(post)}>
                          <div className="grid-item-1 post-mob">
                            <div style={{ flex: 1 }}>
                              <div
                                className="para-txt"
                                style={{
                                  ...clampStyle,
                                  fontSize: "13px",
                                  fontWeight: "600",
                                }}
                              >
                                {post.title}
                              </div>
                              <div style={{ marginTop: "4px" }}>
                                <Space size={8}>
                                  <Text
                                    className="para-txt"
                                    type="secondary"
                                    style={{ fontSize: "12px" }}
                                  >
                                    {new Date(
                                      post.publishedAt
                                    ).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </Text>
                                </Space>
                              </div>
                            </div>
                            {imageUrl ? (
                              <img alt={imageAlt} src={imageUrl} />
                            ) : (
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  No Image
                                </Text>
                              </div>
                            )}
                          </div>
                        </Link>
                      </Col>
                    );
                  })
                )}
              </Row>
            </Col>
          </Row>
        </section>
      )}

      {/* Additional Posts Section */}
      {additionalPosts.length > 0 && (
        <section
          className="latest-posts-grid mob-50"
          style={{ marginTop: "30px" }}
        >
          <div className="category-grid">
            {await Promise.all(
              additionalPosts.map(async (post) => {
                const imageUrl = getImageUrl(post.heroImage?.url);
                const imageAlt = post.heroImage?.alt || post.title;

                return (
                  <div
                    key={post.id}
                    className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "20px",
                    }}
                  >
                    <Link
                      href={await getPostUrl(post)}
                      className="flex flex-col md:flex-row flex-1"
                    >
                      {imageUrl ? (
                        <div
                          className="relative w-full md:w-48 h-48 overflow-hidden rounded-t-lg md:rounded-lg"
                          style={{ padding: "0 20px" }}
                        >
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ borderRadius: "10px" }}
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-48 h-48 bg-gray-100 rounded-t-lg md:rounded-lg flex items-center justify-content-center">
                          <span className="text-gray-400 text-sm">
                            No Image
                          </span>
                        </div>
                      )}
                      <article
                        className="flex flex-col h-full flex-1"
                        style={{ padding: "0 20px" }}
                      >
                        <div className="post-item-category api-title">
                          <div className="flex-1">
                            <h3 className="latest-post-title">
                              {post.title || "Untitled Post"}
                            </h3>
                          </div>
                        </div>
                      </article>
                    </Link>
                    <div
                      className="flex flex-col h-full flex-1"
                      style={{ padding: "0 20px" }}
                    >
                      <div className="post-first-tag">
                        {/* Define categoryLink for additionalPosts section */}
                        {(() => {
                          let categoryLink = "/uncategorized";
                          let categoryTitle = "Uncategorized";
                          if (post.categories && post.categories.length > 0) {
                            const cat = post.categories[0];
                            categoryLink = `/${cat.slug}`;
                            categoryTitle = cat.title;
                            if (cat.parent) {
                              const parent =
                                typeof cat.parent === "string"
                                  ? null
                                  : cat.parent;
                              if (parent) {
                                categoryLink = `/${parent.slug}/${cat.slug}`;
                              }
                            }
                          }
                          return (
                            <Link href={categoryLink}>
                              <h2 className="home-category">{categoryTitle}</h2>
                            </Link>
                          );
                        })()}

                        {/* <span style={{ marginTop: "4px", marginLeft: ((post.tags ?? []).length > 0 ? "8px" : "0") }}>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ fontSize: "12px", color: "#8c8c8c" }} />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        5 Min Read
                      </Text>
                    </Space>
                  </span> */}
                        <span
                          className="shareButton"
                          data-url=""
                          style={{ marginLeft: "8px" }}
                        >
                          <svg
                            width="22"
                            height="18"
                            viewBox="0 0 22 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_4600_28)">
                              <path
                                d="M0.656855 18.3763C0.57123 18.3767 0.486122 18.363 0.40498 18.3356C0.235292 18.2805 0.088454 18.1711 -0.0128684 18.0243C-0.114191 17.8774 -0.164364 17.7013 -0.155645 17.5231C-0.155645 17.4013 0.68123 5.60375 12.5112 4.6775V0.436251C12.5111 0.274716 12.5591 0.116806 12.6491 -0.0173126C12.7392 -0.151431 12.8671 -0.255668 13.0167 -0.316712C13.1662 -0.377755 13.3306 -0.392834 13.4888 -0.360022C13.6469 -0.32721 13.7917 -0.247996 13.9047 -0.132499L21.924 8.0575C22.0729 8.20938 22.1563 8.41358 22.1563 8.62625C22.1563 8.83893 22.0729 9.04312 21.924 9.195L13.9047 17.385C13.7917 17.5005 13.6469 17.5797 13.4888 17.6125C13.3306 17.6453 13.1662 17.6303 13.0167 17.5692C12.8671 17.5082 12.7392 17.4039 12.6491 17.2698C12.5591 17.1357 12.5111 16.9778 12.5112 16.8163V12.6563C4.61373 12.9569 1.37592 17.9375 1.34342 17.9984C1.27012 18.1142 1.16873 18.2095 1.0487 18.2756C0.928659 18.3416 0.793867 18.3763 0.656855 18.3763ZM14.1362 2.42688V5.43719C14.1364 5.64784 14.0547 5.85031 13.9084 6.00189C13.7621 6.15347 13.5627 6.24232 13.3522 6.24969C5.69842 6.53 2.96029 11.6284 1.97717 14.9069C4.00842 13.1519 7.6281 11.0069 13.275 11.0069H13.3115C13.527 11.0069 13.7337 11.0925 13.8861 11.2449C14.0384 11.3972 14.124 11.6039 14.124 11.8194V14.8297L20.2178 8.63031L14.1362 2.42688Z"
                                fill="#A0A0A0"
                              ></path>
                            </g>
                            <defs>
                              <clipPath id="clip0_4600_28">
                                <rect
                                  width="22"
                                  height="18"
                                  fill="white"
                                ></rect>
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Category-Based Sections */}
      {sortedCategories.length === 0 ? (
        <Text>No categories found.</Text>
      ) : (
        await Promise.all(
          sortedCategories.map(async (category) => {
            const posts = await fetchPostsByCategory(category.id);
            if (posts.length === 0) return null;

            const categoryFeaturedPost = posts.length > 0 ? posts[0] : null;
            const categorySmallerPosts1 =
              posts.length > 1 ? posts.slice(1, 4) : [];
            const categorySmallerPosts2 =
              posts.length > 4 ? posts.slice(4, 7) : [];

            if (
              !categoryFeaturedPost &&
              categorySmallerPosts1.length === 0 &&
              categorySmallerPosts2.length === 0
            )
              return null;

            let categoryLink = `/${category.slug}`;
            let postBaseUrl = `/${category.slug}`;
            if (category.parent) {
              const parent =
                typeof category.parent === "string"
                  ? await fetchParentCategory(category.parent)
                  : category.parent;
              if (parent) {
                const parentCategorySlug = parent.slug || "uncategorized";
                categoryLink = `/${parentCategorySlug}/${category.slug}`;
                postBaseUrl = `/${parentCategorySlug}/${category.slug}`;
              }
            }

            return (
              <section key={category.slug} className="home-cate">
                <Link href={categoryLink}>
                  <h2 className="category-title para-txt">{category.title}</h2>
                </Link>
                <Row className="row-03">
                  {categoryFeaturedPost && (
                    <Col className="col-md-3">
                      <Link
                        href={`${postBaseUrl}/${categoryFeaturedPost.slug}`}
                      >
                        <div>
                          {(() => {
                            const imageUrl = getImageUrl(
                              categoryFeaturedPost.heroImage?.url
                            );
                            const imageAlt =
                              categoryFeaturedPost.heroImage?.alt ||
                              categoryFeaturedPost.title;
                            return imageUrl ? (
                              <img
                                alt={imageAlt}
                                src={imageUrl}
                                style={{ borderRadius: "6px" }}
                              />
                            ) : (
                              <div>
                                <Text type="secondary">No Image</Text>
                              </div>
                            );
                          })()}
                          <div
                            className="para-txt"
                            style={{
                              ...clampStyle,
                              fontSize: "13px",
                              fontWeight: "600",
                              padding: "10px",
                            }}
                          >
                            {categoryFeaturedPost.title}
                          </div>
                          <div style={{ paddingLeft: "10px" }}>
                            <Text
                              className="para-txt"
                              type="secondary"
                              style={{ fontSize: "12px" }}
                            >
                              {new Date(
                                categoryFeaturedPost.publishedAt
                              ).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </Text>
                          </div>
                        </div>
                      </Link>
                    </Col>
                  )}

                  <Col className="col-md-3">
                    <Row style={{ margin: "0" }}>
                      {categorySmallerPosts1.map((post) => {
                        const imageUrl = getImageUrl(post.heroImage?.url);
                        const imageAlt = post.heroImage?.alt || post.title;

                        return (
                          <Col xs={24} key={post.id}>
                            <Link href={`${postBaseUrl}/${post.slug}`}>
                              <div className="news-post">
                                {imageUrl ? (
                                  <img alt={imageAlt} src={imageUrl} />
                                ) : (
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: "12px" }}
                                    >
                                      No Image
                                    </Text>
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <div
                                    className="para-txt"
                                    style={{
                                      ...clampStyle,
                                      fontSize: "13px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {post.title}
                                  </div>
                                  <div style={{ marginTop: "4px" }}>
                                    <Space size={4}>
                                      <Text
                                        className="para-txt"
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        {new Date(
                                          post.publishedAt
                                        ).toLocaleDateString("en-US", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </Text>
                                    </Space>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </Col>
                        );
                      })}
                    </Row>
                  </Col>

                  <Col className="col-md-3">
                    <Row style={{ margin: "0" }}>
                      {categorySmallerPosts2.map((post) => {
                        const imageUrl = getImageUrl(post.heroImage?.url);
                        const imageAlt = post.heroImage?.alt || post.title;

                        return (
                          <Col xs={24} key={post.id}>
                            <Link href={`${postBaseUrl}/${post.slug}`}>
                              <div className="news-post">
                                {imageUrl ? (
                                  <img alt={imageAlt} src={imageUrl} />
                                ) : (
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: "12px" }}
                                    >
                                      No Image
                                    </Text>
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <div
                                    className="para-txt"
                                    style={{
                                      ...clampStyle,
                                      fontSize: "13px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {post.title}
                                  </div>
                                  <div style={{ marginTop: "4px" }}>
                                    <Space size={4}>
                                      <Text
                                        className="para-txt"
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        {new Date(
                                          post.publishedAt
                                        ).toLocaleDateString("en-US", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </Text>
                                    </Space>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </Col>
                        );
                      })}
                    </Row>
                  </Col>
                </Row>
              </section>
            );
          })
        )
      )}
    </div>
  );
}


export async function generateStaticParams() {
  const categories = await fetchCategories();
  const paths: { categorySlug: string; postSlug: string }[] = [];

  // Fetch all posts
  try {
    const res = await axios.get(`${apiUrl}/api/posts?limit=1000&depth=2`);
    const posts: Post[] = res.data.docs || [];

    // Generate paths for posts
    for (const post of posts) {
      if (post.categories && post.categories.length > 0) {
        const primaryCategory = post.categories[0];
        let categorySlug = primaryCategory.slug;

        // Handle subcategories
        if (primaryCategory.parent) {
          const parent =
            typeof primaryCategory.parent === "string"
              ? await fetchParentCategory(primaryCategory.parent)
              : primaryCategory.parent;
          if (parent) {
            categorySlug = parent.slug;
          } else {
            continue; // Skip if parent category is not found
          }
        }

        paths.push({
          categorySlug,
          postSlug: post.slug || "fallback-slug",
        });
      }
    }

    // Generate paths for top-level categories as postSlug (if they act as a category page)
    for (const category of categories) {
      if (!category.parent) {
        paths.push({
          categorySlug: category.slug,
          postSlug: category.slug, // Treat category as a postSlug for category pages
        });
      }
    }

    console.log(`Generated ${paths.length} static paths`);
    return paths;
  } catch (err) {
    console.error("Error in generateStaticParams:", err);
    return [];
  }
}