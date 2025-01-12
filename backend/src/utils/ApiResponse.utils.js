class ApiResponse {
  constructor(message = "Success", statusCode, data) {
    this.data = data;
    this.message = message;
    this.statusaCode = statusCode;
    this.success = statusCode < 400;
  }
}
export { ApiResponse };
