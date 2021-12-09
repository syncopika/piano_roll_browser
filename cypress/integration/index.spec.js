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
        // make sure instrument grid is there
        cy.get('#instrumentGrid').should('be.visible');
        // make sure one instrument exists
        cy.get('#instrumentGrid').find("#instrumentTable").should('be.visible');
        cy.get('#instrumentGrid').find("#instrumentTable").children().its('length').should('eq', 1);
        
        // make sure the piano roll grid is there
        cy.get('#piano').should('be.visible');
        // expect the right number of notes
        cy.get('#piano').children().its('length').should('eq', 74); // 73 + 1 for the columnHeader row
        
        // make sure the mobile piano keys div is there
        cy.get('#pianoNotes').should('be.visible');
        // check number of notes
        cy.get('#pianoNotes').children().its('length').should('eq', 73);
        
        // check buttons
        cy.get('#buttons').should('be.visible');
        cy.get('#buttons').find('li').its('length').should('eq', 12);
    });
    
    it('can create a new note', function(){
        const elementId = '#A7col_5';
        const note = '#note0';
        
        cy.get(elementId).click();
        
        cy.get(elementId).find(note).should('have.css', 'width').and('eq', '40px');
        
        // cypress appears to be adding extra stuff to the background style??
        const expectedBgStyle = "rgba(0, 0, 0, 0) linear-gradient(90deg, rgb(0, 158, 52) 90%, rgb(52, 208, 0) 99%) repeat scroll 0% 0% / auto padding-box border-box";
        cy.get(elementId).find(note).should('have.css', 'background').and('eq', expectedBgStyle);
        
        // check context-menu on right-click
        cy.get('#context-menu-layer').should('not.exist');
        cy.get(elementId).find(note).should('have.class', 'context-menu-one');
        cy.get(elementId).find(note).rightclick(); // open context-menu
        cy.get(elementId).find(note).should('have.class', 'context-menu-active');
        cy.get('.context-menu-list').should('be.visible');
        cy.get('#context-menu-layer').click(); // remove context-menu by clicking somewhere else
        cy.get('.context-menu-list').should('not.exist');
    });
    
    // TODO:
    // check context-menu for instrument
    // check time signature change correctly changing num measures, headers
    // check context-menu delete
    // check add/delete instrument
    // check add/delete measure
    
});
