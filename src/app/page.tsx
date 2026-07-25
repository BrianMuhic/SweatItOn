import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden px-5 pb-16 pt-6 md:px-10">
      <div className="heat-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center">
        <p className="hero-copy mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--lime)]">
          Friend fitness rivalries
        </p>
        <h1 className="hero-brand font-[family-name:var(--font-display)] text-[clamp(4.5rem,16vw,9rem)] leading-[0.85] text-[var(--text)]">
          SweatItOn
        </h1>
        <p className="hero-copy mt-5 max-w-xl text-lg text-[var(--muted)] md:text-xl">
          Connect Strava once. Crown the rival who burns the most calories —
          and keep score on walk + run miles and pace.
        </p>
        <div className="hero-cta mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--bg)] shadow-[0_0_40px_var(--glow)] transition hover:brightness-110"
          >
            Start a rivalry
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--muted)]"
          >
            Join a group
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
        {[
          {
            title: "Calories crown the winner",
            body: "Whoever burns the most wins the period. That’s the SweatItOn rule.",
          },
          {
            title: "Miles & pace on the board",
            body: "Combined walk + run miles, plus average run and walk pace for every rival.",
          },
          {
            title: "Apple Watch & Garmin",
            body: "One Strava connect covers both. Private groups lock behind a password.",
          },
        ].map((item) => (
          <article key={item.title} className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
