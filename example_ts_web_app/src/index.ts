import JSONEditor, {JSONEditorOptions} from 'jsoneditor';
import {css, CSSResult, customElement, html, LitElement, property, TemplateResult} from 'lit-element';

// Used to include styles from node_modules, for example those in json editor.
require('./styles.css');

/**
 * Application entry element. Handles routing through the other components.
 */
@customElement('app-element')
export class AppElement extends LitElement {
  @property({type: String}) randomString = 'String';

  /** Check if the json editor has been created. */
  private jsonEditorCreated: boolean = false;

  static get styles(): CSSResult {
    return css`
      .container {
        width: 100vw;
        height: 50vh;
      }
    `;
  }

  /**
   * Implement `render` to define a template for your element.
   */
  render(): TemplateResult {
    return html`
      <div class="container">
        The random string is ${this.randomString}.
        <div id="json"></div>
      </div>
    `;
  }

  updated(): void {
    if (!this.jsonEditorCreated) {
      this.jsonEditorCreated = true;

      // Create a Div Element and append it to the body, use that for the
      // JSONEditor library. Due to how shadowroot works adding the json editor
      // within the lit elment will eave the tool without syles.
      const element = document.createElement('div');
      element.id = 'json-editor-container';
      document.body.appendChild(element);

      const options: JSONEditorOptions = {mode: 'tree'};
      const editor = new JSONEditor(element as HTMLElement, options);

      const testJson = {
        'Array': [1, 2, 3],
        'Boolean': true,
        'Null': null,
        'Number': 123,
        'Object': {'a': 'b', 'c': 'd'},
        'String': 'Hello World'
      };
      editor.set(testJson);
    }
  }
}
