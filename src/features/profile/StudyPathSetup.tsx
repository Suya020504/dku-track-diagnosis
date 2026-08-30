import { ProfileFlow, type ProfileFlowProps } from "./ProfileFlow";

/**
 * Compatibility entry point for existing imports. ProfileFlow owns the single
 * draft and delegates each URL-controlled stage to one focused step.
 */
export function StudyPathSetup(props: ProfileFlowProps) {
  return <ProfileFlow {...props} />;
}
