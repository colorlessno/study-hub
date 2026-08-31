import { Link, type LinkProps } from 'react-router-dom';

export function StudyHubLink(props: LinkProps) {
  const target = window.self === window.top ? props.target : '_top';
  return <Link {...props} target={target} />;
}
