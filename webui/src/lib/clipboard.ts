function copyWithExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => copyWithExecCommand(text),
      );
    } catch {
      return Promise.resolve(copyWithExecCommand(text));
    }
  }

  return Promise.resolve(copyWithExecCommand(text));
}
