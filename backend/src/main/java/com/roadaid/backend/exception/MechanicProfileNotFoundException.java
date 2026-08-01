package com.roadaid.backend.exception;

public class MechanicProfileNotFoundException extends RuntimeException {

    public MechanicProfileNotFoundException(String message) {
        super(message);
    }
}