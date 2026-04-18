const DOCS = {
  base: '/api',
  endpoints: [
    {
      path: '/api/project',
      method: 'GET',
      description: 'Fetch project metadata from untitled.stream.',
      params: [
        { name: 'id', type: 'string', required: true, description: 'Project ID or slug' },
      ],
      response: {
        project: 'object — project metadata (title, artist_name, artwork_signed_url, …)',
        tracks: 'array — track list with title, duration, audio_url, …',
      },
      example: '/api/project?id=07Yx5TKbde5Methtebrr5',
    },
    {
      path: '/api/signedUrl',
      method: 'GET',
      description: 'Proxy a short-lived signed URL for a private audio object.',
      params: [
        {
          name: 'object',
          type: 'string',
          required: true,
          description: 'Object path in the form <bucket>/<path>, e.g. private-audio/owner/file.mp3',
        },
      ],
      response: {
        signedURL: 'string — signed URL valid for ~3 hours',
      },
      allowedBuckets: ['private-transcoded-audio', 'private-audio'],
      example: '/api/signedUrl?object=private-audio/owner/track.mp3',
    },
  ],
};

export async function onRequest() {
  return new Response(JSON.stringify(DOCS, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
