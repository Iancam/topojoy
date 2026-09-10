import React from "react";
import { Link, useParams } from "react-router";
import { Header } from "../components/Header";
import { getBlogPostBySlug } from "../lib/blog";

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Post not found
          </h1>
          <Link
            to="/blog"
            className="text-teal-700 hover:underline"
          >
            Back to blog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-20">
        {post.date && (
          <p className="text-sm text-gray-500 mb-2">
            {new Date(post.date).toLocaleDateString()}
          </p>
        )}
        <div
          className="prose prose-sm sm:prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        <div className="mt-12">
          <Link to="/blog" className="text-teal-700 hover:underline">
            Back to blog
          </Link>
        </div>
      </main>
    </div>
  );
};
