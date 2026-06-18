export class ApiResponse {
    constructor (
        statusCode = 200,
        data,
        message = "Response Sent !"
    ) {
        this.statusCode = statusCode,
        this.message = message,
        this.data = data
        this.success = statusCode < 400;
    }
}