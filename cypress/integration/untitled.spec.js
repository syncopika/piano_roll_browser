// untitled.spec.js created with Cypress
//
// Start writing your Cypress tests below!
// If you're unfamiliar with how Cypress works,
// check out the link below and learn how to write your first test:
// https://on.cypress.io/writing-first-test

describe('first test', function(){
    
    beforeEach(() => {
        cy.visit('index.html');
    });
    
    it('check existence of stuff', function(){
        cy.get('#instrumentGrid').should('be.visible');
        cy.get('#piano').should('be.visible');
    });
    
    it('can create a new note', function(){
        const elementId = '#A7col_5';
        const note = '#note0';
        
        cy.get(elementId).click();
        
        cy.get(elementId).find(note).should('have.css', 'width').and('eq', '40px');
        
        // cypress appears to be adding extra stuff to the background style??
        const expectedBgStyle = "rgba(0, 0, 0, 0) linear-gradient(90deg, rgb(0, 158, 52) 90%, rgb(52, 208, 0) 99%) repeat scroll 0% 0% / auto padding-box border-box";
        cy.get(elementId).find(note).should('have.css', 'background').and('eq', expectedBgStyle);
    });
    
});
