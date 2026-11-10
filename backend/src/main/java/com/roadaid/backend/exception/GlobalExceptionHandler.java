package com.roadaid.backend.exception;

import com.roadaid.backend.dto.ErrorResponse;
import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MechanicNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMechanicNotFound(
            MechanicNotFoundException ex) {

        return buildErrorResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex) {

        return buildErrorResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
    }

    @ExceptionHandler(MechanicAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleMechanicAlreadyExists(
            MechanicAlreadyExistsException ex) {

        return buildErrorResponse(
                HttpStatus.CONFLICT,
                ex.getMessage()
        );
    }

    @ExceptionHandler(MechanicProfileNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMechanicProfileNotFound(
            MechanicProfileNotFoundException ex) {

        return buildErrorResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex) {

        String message = "Validation error";

        if (ex.getBindingResult().getFieldError() != null) {
            message = ex.getBindingResult()
                    .getFieldError()
                    .getDefaultMessage();
        }

        return buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex) {

        ex.printStackTrace();

        return buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(
            Exception ex) {

        ex.printStackTrace();

        String message = ex.getMessage();

        if (message == null || message.isBlank()) {
            message = ex.getClass().getSimpleName();
        }

        return buildErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                message
        );
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(
            HttpStatus status,
            String message) {

        ErrorResponse error = new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                message
        );

        return new ResponseEntity<>(
                error,
                status
        );
    }
}