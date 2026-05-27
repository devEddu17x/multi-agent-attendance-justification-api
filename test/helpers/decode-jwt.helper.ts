export const decodeJWT = (token: string) => {
  const payload = JSON.parse(
    Buffer.from(
      token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8'),
  );
  return payload ?? '';
};
