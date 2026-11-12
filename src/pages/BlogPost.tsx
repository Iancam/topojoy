import React from "react";
import { Link, useParams } from "react-router";
import { Header } from "../components/Header";
import { getBlogPostBySlug } from "../lib/blog";

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="theme-topojoy-paper min-h-screen bg-canvas text-text">
        <Header />
        <main className="max-w-3xl mx-auto px-6 pt-28 pb-24 md:pt-36">
          <h1 className="font-serif text-3xl font-normal text-text mb-4">
            Post not found
          </h1>
          <Link
            to="/blog"
            className="text-action hover:text-action-hover underline underline-offset-4 transition-colors"
          >
            Back to blog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="theme-topojoy-paper min-h-screen bg-canvas text-text">
      <Header />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24 md:pt-36">
        {post.date && (
          <p className="text-sm text-text-subtle mb-6 tracking-wide">
            {new Date(post.date).toLocaleDateString()}
          </p>
        )}
        <div
          className="flow-root prose prose-topojoy max-w-none md:prose-lg prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        <div className="mt-12">
          <Link
            to="/blog"
            className="text-action hover:text-action-hover underline underline-offset-4 transition-colors"
          >
            Back to blog
          </Link>
        </div>
      </main>
    </div>
  );
};
