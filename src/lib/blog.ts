export type BlogPost = {
  slug: string;
  title: string;
  date?: string;
  excerpt?: string;
  html: string;
  attributes: Record<string, any>;
};

type BlogModule = {
  html: string;
  attributes: Record<string, any>;
};

const modules = import.meta.glob("/src/content/blog/*.md", {
  eager: true,
}) as Record<string, BlogModule>;

const images = import.meta.glob<string>(
  "/src/content/blog/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true, query: "?url", import: "default" },
);

const resolveImages = (html: string, markdownPath: string): string => {
  const directory = markdownPath.slice(0, markdownPath.lastIndexOf("/") + 1);
  return html.replace(
    /(<img\b[^>]*\bsrc=")([^"]+)(")/g,
    (match, before, src, after) => {
      const url = images[`${directory}${src.replace(/^\.\//, "")}`];
      return url ? `${before}${url}${after}` : match;
    },
  );
};

const extractTitle = (html: string): string | undefined => {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
  if (!match) return undefined;
  const tmp = document.createElement("div");
  tmp.innerHTML = match[1];
  return tmp.textContent?.trim();
};

export const getBlogPosts = (): BlogPost[] => {
  const posts = Object.entries(modules).map(([path, mod]) => {
    const filename = path.split("/").pop() ?? "";
    const slug = filename.replace(/\.md$/, "");
    const attrs = mod.attributes ?? {};
    const title =
      typeof attrs.title === "string"
        ? attrs.title
        : (extractTitle(mod.html) ?? slug);

    return {
      slug,
      title,
      date: typeof attrs.date === "string" ? attrs.date : undefined,
      excerpt: typeof attrs.excerpt === "string" ? attrs.excerpt : undefined,
      html: resolveImages(mod.html, path),
      attributes: attrs,
    };
  });

  return posts.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });
};

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
  return getBlogPosts().find((post) => post.slug === slug);
};
