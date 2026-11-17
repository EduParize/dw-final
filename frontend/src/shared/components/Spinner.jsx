export default function Spinner({ pequeno = false }) {
  return <span className={`spinner${pequeno ? ' spinner--pequeno' : ''}`} aria-hidden="true" />;
}
