/**
 * Trigger a browser file download from an axios blob response.
 * Extracts the filename from the Content-Disposition header when available.
 *
 * @param {Object} response - Axios response object (response.data must be a Blob)
 * @param {string} defaultFilename - Fallback filename if header is missing
 */
export function downloadBlob(response, defaultFilename) {
  const disposition = response.headers?.['content-disposition'];
  const match = disposition && disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : defaultFilename;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
