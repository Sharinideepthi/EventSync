// __tests__/mocks/mockUser.js
module.exports = {
  validUser: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
    department: 'Product',
    role: 'user'
  },
  loginCredentials: {
    email: 'test@example.com',
    password: 'Password123'
  },
  invalidLoginCredentials: {
    email: 'test@example.com',
    password: 'wrongpassword'
  }
};

// __tests__/mocks/mockEmail.js
// module.exports = {
//   mockSendEmail: jest.fn().mockImplementation(() => Promise.resolve())
// };