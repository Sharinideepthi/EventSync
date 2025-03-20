module.exports = {
  mockSendEmail: jest.fn().mockImplementation(() => Promise.resolve()),
};
// const mockSendEmail = jest.fn().mockResolvedValue(true);
// jest.mock("../utils/sendEmail", () => mockSendEmail);
