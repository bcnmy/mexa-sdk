import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button,
    Form,
    Container,
    Menu,
    Responsive,
    Segment,
    Sidebar,
    Visibility, } from 'semantic-ui-react';
import { Router } from '../routes';

const getWidth = () => {
    const isSSR = typeof window === 'undefined'
    return isSSR ? Responsive.onlyTablet.minWidth : window.innerWidth
  }

class DesktopContainer extends Component {
    state = {
      merchantLoading: false,
      investorLoading: false
    }
  
    hideFixedMenu = () => this.setState({ fixed: false })
    showFixedMenu = () => this.setState({ fixed: true })
  
      HomePage = async (event) => {
          event.preventDefault();
          try{
            Router.pushRoute(`/`);
          }catch(err){
          }
      };

  
    render() {
  
      const { children } = this.props
      const { fixed } = this.state
  
      return (
        <Responsive getWidth={getWidth} minWidth={Responsive.onlyTablet.minWidth}>
          <Visibility
            once={false}
            onBottomPassed={this.showFixedMenu}
            onBottomPassedReverse={this.hideFixedMenu}
          >
            <Segment
              inverted
              textAlign='center'
              style={{ minHeight: 65, padding: '0em 0em', marginBottom: "30px" }}
              vertical
            >
              <Menu
                fixed={fixed ? 'top' : null}
                inverted={!fixed}
                pointing={!fixed}
                secondary={!fixed}
                size='large'
              >
                <Container>
                  <Menu inverted pointing secondary size='large'>
                  <Menu.Item>
                    
                  <Form onSubmit={this.HomePage}>
                      <Button style={{ marginLeft: '0em', color: "#000" }}>
                        InstCryp
                      </Button>
                      </Form>
                  </Menu.Item>
                </Menu>
                </Container>
              </Menu>
            </Segment>
          </Visibility>
          {children}
        </Responsive>
      )
    }
  }
  
  DesktopContainer.propTypes = {
    children: PropTypes.node,
  }

  class MobileContainer extends Component {
  
    state = {
    }

    handleSidebarHide = () => this.setState({ sidebarOpened: false })
    handleToggle = () => this.setState({ sidebarOpened: true })
  
    HomePage = async (event) => {
      event.preventDefault();
      try{
        Router.pushRoute(`/`);
      }catch(err){
      }
    };
  
    render() {
      const { children } = this.props
      const { sidebarOpened } = this.state
  
      return (
          <Responsive
              as={Sidebar.Pushable}
              getWidth={getWidth}
              maxWidth={Responsive.onlyMobile.maxWidth}>
            <Segment
              inverted
              textAlign='center'
              style={{ minHeight: 65, padding: '1em 0em', marginBottom: "30px"}}
              vertical
              >
              <Container>
                <Menu inverted pointing secondary size='large'>
                  <Menu.Item>
                    <Form onSubmit={this.HomePage}>
                      <Button style={{ marginLeft: '0em', color: "#000" }}>
                        InstCryp
                      </Button>
                      </Form>
                  </Menu.Item>
                </Menu>
              </Container>
            </Segment>
            {children}
        </Responsive>
      )
    }
  }
  
  MobileContainer.propTypes = {
    children: PropTypes.node,
  }
  
  const ResponsiveContainer = ({ children }) => (
    <div>
      <DesktopContainer>{children}</DesktopContainer>
      <MobileContainer>{children}</MobileContainer>
    </div>
  )
  
  ResponsiveContainer.propTypes = {
    children: PropTypes.node,
  }

class CHeader extends Component{

    render () {
        return (
            
                <ResponsiveContainer>
                    
                </ResponsiveContainer>

        );
    };
}

export default CHeader;