export function cameraErrorMessage(error: unknown): string {
  const name=error && typeof error==="object" && "name" in error ? String(error.name) : "";
  if(name==="NotAllowedError"||name==="PermissionDeniedError")return "Camera access was blocked. Allow camera access in your browser’s site settings, then try again. You can also upload a photo.";
  if(name==="NotFoundError"||name==="DevicesNotFoundError")return "No camera was found on this device. Connect a camera or upload a photo instead.";
  if(name==="NotReadableError"||name==="TrackStartError")return "The camera may be in use by another app. Close that app and try again, or upload a photo.";
  if(name==="SecurityError")return "This browser doesn’t allow camera access here. Open the app in your regular browser or upload a photo.";
  return "The camera couldn’t start. Try again, open the app in your regular browser, or upload a photo.";
}
export function stopCamera(stream: Pick<MediaStream,"getTracks"> | null) { stream?.getTracks().forEach(track=>track.stop()); }
