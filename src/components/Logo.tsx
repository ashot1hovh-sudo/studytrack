/**
 * Brand wordmark, themed.
 *
 * Both files are rendered and toggled with CSS rather than swapping `src` from
 * React state: the theme class is on <html> before the first paint, so the
 * correct logo is visible immediately. Picking the src in JS would show the
 * light logo for a frame on every load in night mode.
 *
 * The two files are the same wordmark — the navy lettering is white in the dark
 * version, so it reads on a dark surface.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kai-kitay-logo-light.png"
        alt="Кай Китай"
        className={`${className} dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kai-kitay-logo-dark.png"
        alt="Кай Китай"
        aria-hidden="true"
        className={`${className} hidden dark:block`}
      />
    </>
  )
}
