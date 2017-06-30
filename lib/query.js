/**
 * Functions to query properties of nodes
 */

const build = require('./build')
const {print} = require('math-parser')

export const isIdentifier = node => node && node.type === 'Identifier'
export const isApply = node => node && node.type === 'Apply'
export const isParens = node => node && node.type === 'Parentheses'

// deprecated, use isApply
export const isOperation = node => isApply(node) && !isNumber(node)
export const isFunction = node => isApply(node) && isIdentifier(node.op)

// TODO: curry it?
export const _isOp = (op, node) => isApply(node) && node.op === op

export const isAdd = node => _isOp('add', node)
export const isMul = node => _isOp('mul', node)
export const isDiv = node => _isOp('div', node)
export const isPow = node => _isOp('pow', node)
export const isNeg = node => _isOp('neg', node)
export const isPos = node => _isOp('pos', node)
export const isAbs = node => _isOp('abs', node)
export const isFact = node => _isOp('fact', node)
export const isNthRoot = node => _isOp('nthRoot', node)
export const isFraction = node => isNeg(node) ? isFraction(node.args[0]) : isDiv(node)
export const isConstantFraction = node => isFraction(node) && node.args.every(isNumber)
export const isIntegerFraction = node => isFraction(node) && node.args.every(isInteger)
export const isDecimal = node => isNumber(node) && getValue(node) % 1 != 0

const relationIdentifierMap = {
    'eq': '=',
    'lt': '<',
    'le': '<=',
    'gt': '>',
    'ge': '>=',
    'ne': '!=',
}

export const isRel = node => isApply(node) && node.op in relationIdentifierMap

export const isNumber = node => {
    if (node.type === 'Number') {
        return true
    } else if (isNeg(node)) {
        return isNumber(node.args[0])
    } else {
        return false
    }
}

export const isInteger = node => {
    return isNumber(node) && Number.isInteger(Number(node.value))
}

export const isPolynomial = (node) => {
    return isAdd(node) && node.args.every(isPolynomialTerm)
}

export const isVariableFactor = (node) =>
    isIdentifier(node) ||
    isPow(node) && isIdentifier(node.args[0])
    && (isNumber(node.args[1]) || isVariableFactor(node.args[1]))

export const isPolynomialTerm = (node) => {
    if (isNumber(node) || isConstantFraction(node) || isDecimal(node)) {
        return true
    } else if (isIdentifier(node)) {
        return true
    } else if (isPow(node)) {
        const [base, exponent] = node.args
        return (isIdentifier(base) || isPolynomial(base)) && isPolynomialTerm(exponent)
    } else if (isNeg(node)) {
        return isPolynomialTerm(node.args[0])
    } else if (isMul(node)) {
        return node.args.every(isPolynomialTerm)
    }
}

export const isImplicit = (node) => {
    if (isMul(node)) {
        return node.implicit
    } else if (isNeg(node)) {
        return isImplicit(node.args[0])
    } else {
        return false
    }
}

// check if it's a number before trying to get its value
export const getValue = node => {
    if (node.type === 'Number') {
        return parseFloat(node.value)
    } else if (isNeg(node)) {
        return -getValue(node.args[0])
    } else if (isPos(node)) {
        return getValue(node.args[0])
    } else {
        return null
    }
}

export const getNumerator = (node) => {
    if (isFraction(node)) {
        return isNeg(node) ? getNumerator(node.args[0]) : node.args[0]
    } else {
        return null
    }
}

export const getDenominator = (node) => {
    if (isFraction(node)) {
        return isNeg(node) ? getDenominator(node.args[0]) : node.args[1]
    } else {
        return null
    }
}

// TODO: handle multivariable polynomials
// Get degree of a polynomial term
// e.g. 6x^2 -> 2
export const getPolyDegree = (node) => {
    if (isNumber(node)) {
        return build.number(0)
    } else if (isIdentifier(node) || isPolynomial(node)){
        return build.number(1)
    } else if (isPow(node)) {
        return node.args[1]
    } else if (isMul(node)){
        return getPolyDegree(node.args[1])
    } else if (isNeg(node)) {
        const variable = node.args[0]
        return getPolyDegree(variable.args[1])
    } else {
        return null
    }
}

export const getCoefficient = (node) => {
    if (isNumber(node)) {
        return node
    } else if (isIdentifier(node) || isPow(node)) {
        return build.numberNode('1')
    } else if (isNeg(node)) {
        const result = build.applyNode('neg', [getCoefficient(node.args[0])])
        result.wasMinus = node.wasMinus
        return result
    } else if (isMul(node)) {
        const numbers = node.args.filter(arg => isNumber(arg) || isConstantFraction(arg))
        if (numbers.length > 1) {
            return build.mul(...numbers)
        } else if (numbers.length > 0) {
            return numbers[0]
        } else {
            return build.numberNode('1')
        }
    }
}

export const getVariableFactors = (node) => {
    if (isVariableFactor(node)) {
        return [node]
    } else if (isMul(node)) {
        return node.args.filter(isVariableFactor)
    } else if (isNeg(node)) {
        // TODO: figure out how to handle (x)(-y)(z)
        return getVariableFactors(node.args[0])
    } else {
        return []
    }
}

export const getVariableFactorName = (node) => {
    if (isIdentifier(node)) {
        return node.name
    } else if (isPow(node)) {
        return getVariableFactorName(node.args[0])
    } else {
        return null
    }
}

export const sortVariables = (variables) =>
    variables.sort(
        (a, b) => getVariableFactorName(a) > getVariableFactorName(b))

export const hasConstantBase = node => isPow(node) && isNumber(node.args[0])

export const getCoefficientsAndConstants = (node, coefficientMap = {}, constants = [], others = []) => {
    if (isNumber(node) || isConstantFraction(node)) {
        constants.push(node)
    } else if(isPolynomial(node) || isApply(node)) {
        node.args.forEach(function(arg) {
            getCoefficientsAndConstants(arg, coefficientMap, constants, others)
        })
    } else if(isPolynomialTerm(node) && !hasConstantBase(node)) {
      const sortedVariables = sortVariables(getVariableFactors(node))

      const coefficient = getCoefficient(node)
      const implicit = isImplicit(node)
      const key = sortedVariables.length > 1
            ? print(build.applyNode('mul', sortedVariables, {implicit}))
            : print(sortedVariables[0])
      
      if (!(key in coefficientMap)) {
        coefficientMap[key] = [coefficient]
      } else {
        coefficientMap[key].push(coefficient)
      }
    } else {
        others.push(node)
    }

    return {coefficientMap, constants, others}
}

// returns true if two nodes have the same base variable
// e.g. (x + 1)^1 and (x + 1)^3 , true
// e.g. x^2, (x + 1)^2, false
export const hasSameBase = (node1, node2) => {
    return print(node1) == print(node2)
        || isPow(node1) && print(node1.args[0]) == print(node2)
        || isPow(node2) && print(node1) == print(node2.args[0])
        || isPow(node1) && isPow(node2) && print(node1.args[0]) == print(node2.args[0])
}
