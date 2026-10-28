import React from "react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { getBlogPosts } from "../lib/blog";

export const Blog: React.FC = () => {
  const posts = getBlogPosts();

  return (
    <div className="theme-topojoy-paper min-h-screen bg-canvas text-text">
      <Header />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24 md:pt-36">
        <h1 className="font-serif text-4xl md:text-5xl font-normal tracking-tight mb-12">
          Blog
        </h1>
        {posts.length === 0 ? (
          <p className="text-text-subtle">No posts yet.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="border-b border-border/40 pb-10"
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="font-serif text-2xl md:text-3xl text-text hover:text-action transition-colors focus-visible:outline-ring focus-visible:outline-offset-4"
                >
                  {post.title}
                </Link>
                {post.date && (
                  <p className="text-sm text-text-subtle mt-1">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
                )}
                {post.excerpt && (
                  <p className="text-text-muted mt-4 text-lg leading-relaxed">
                    {post.excerpt}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
