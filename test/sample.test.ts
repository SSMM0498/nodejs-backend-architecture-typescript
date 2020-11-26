import { expect } from "chai";
import Calculator from "../src/sample";

describe('calculate', function () {
    it('add', function () {
        let result = Calculator.sum(5, 2);
        expect(result).equal(7);
    });
});