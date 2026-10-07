"use client";

import { useState } from "react";
import { Pause, Play, Quote } from "lucide-react";
import { Marquee } from "@/registry/magicui/marquee";

const reviews = [
  {
    name: "Jack",
    username: "@jack",
    body: "I've never seen anything like this before. It's amazing. I love it.",
  },
  {
    name: "Jill",
    username: "@jill",
    body: "I don't know what to say. I'm speechless. This is amazing.",
  },
  {
    name: "John",
    username: "@john",
    body: "I'm at a loss for words. This is amazing. I love it.",
  },
  {
    name: "Jane",
    username: "@jane",
    body: "I'm at a loss for words. This is amazing. I love it.",
  },
];

function ReviewCard({ name, username, body }: (typeof reviews)[number]) {
  return (
    <figure className="landing-review-card">
      <figcaption>
        <span
          className={`landing-review-avatar avatar-${name.toLowerCase()}`}
          aria-hidden="true"
        >
          {name.slice(0, 2)}
        </span>
        <span>
          <strong>{name}</strong>
          <small>{username}</small>
        </span>
        <Quote size={19} aria-hidden="true" />
      </figcaption>
      <blockquote>{body}</blockquote>
    </figure>
  );
}

export function LandingReviews() {
  const [paused, setPaused] = useState(false);
  return (
    <section
      className={`landing-reviews ${paused ? "is-paused" : ""}`}
      aria-labelledby="landing-reviews-title"
    >
      <div className="landing-wrap landing-reviews-heading">
        <div>
          <h2 id="landing-reviews-title" className="landing-eyebrow">
            FOR THE BUSINESS YOU'RE BUILDING
          </h2>
          <p>Sample reviews - A preview of our community</p>
        </div>
        <button
          type="button"
          className="landing-reviews-toggle"
          aria-pressed={paused}
          aria-label="Pause review animations"
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          <span>{paused ? "Resume" : "Pause"}</span>
        </button>
      </div>
      <div className="landing-reviews-tracks">
        <Marquee pauseOnHover>
          {reviews.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </Marquee>
        <div className="landing-reviews-fade fade-left" aria-hidden="true" />
        <div className="landing-reviews-fade fade-right" aria-hidden="true" />
      </div>
    </section>
  );
}
